import { useEffect, useMemo, useState } from 'react';
import { listEntries, deleteEntry, saveEntry } from '../../lib/db.js';
import { organizeBase, getStructure } from '../../lib/organize.js';
import { getApiKey } from '../../lib/settings.js';
import { renderMarkdown } from '../../lib/markdown.js';

const TYPE_LABELS = {
  ecran: 'Écran',
  regle: 'Règle de gestion',
  workflow: 'Workflow',
  donnees: 'Données',
  autre: 'Autre',
};

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function KnowledgeView({ notice, onDismissNotice }) {
  const [entries, setEntries] = useState([]);
  const [structure, setStructure] = useState(null);
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState(null);
  const [organizing, setOrganizing] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(null);

  function startEdit(e) {
    setEditingId(e.id);
    setForm({
      title: e.title,
      module: e.module,
      type: e.type,
      summary: e.summary,
      details: e.details,
      notes: e.notes || '',
      tags: (e.tags || []).join(', '),
    });
    setOpenId(e.id);
  }

  async function saveEdit(original) {
    const updated = {
      ...original,
      title: form.title.trim() || original.title,
      module: form.module.trim() || original.module,
      type: form.type,
      summary: form.summary.trim(),
      details: form.details,
      notes: form.notes.trim(),
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10),
      updatedAt: Date.now(),
    };
    await saveEntry(updated);
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setEditingId(null);
    setForm(null);
  }

  useEffect(() => {
    listEntries().then(setEntries).catch(() => {});
    getStructure().then(setStructure).catch(() => {});
  }, []);

  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);

  // Plan numéroté : chapitres 1., sections 1.1 — fiches résolues et vivantes.
  const plan = useMemo(() => {
    if (!structure?.chapters?.length) return null;
    const placed = new Set();
    const chapters = structure.chapters
      .map((ch, ci) => ({
        num: `${ci + 1}`,
        title: ch.title,
        sections: ch.sections
          .map((s, si) => ({
            num: `${ci + 1}.${si + 1}`,
            title: s.title,
            items: s.entryIds
              .map((id) => {
                const e = byId.get(id);
                if (e) placed.add(id);
                return e;
              })
              .filter(Boolean),
          }))
          .filter((s) => s.items.length),
      }))
      .filter((ch) => ch.sections.length);
    // Fiches ajoutées depuis la dernière organisation.
    const fresh = entries.filter((e) => !placed.has(e.id));
    if (fresh.length) {
      chapters.push({
        num: `${chapters.length + 1}`,
        title: 'À classer',
        sections: [
          {
            num: `${chapters.length + 1}.1`,
            title: 'Nouvelles fiches',
            items: fresh,
          },
        ],
      });
    }
    return chapters.length ? chapters : null;
  }, [structure, byId, entries]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return entries.filter((e) =>
      [e.title, e.module, e.summary, e.details, ...(e.tags || [])]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [entries, search]);

  async function onDelete(id) {
    await deleteEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function onOrganize() {
    if (!getApiKey()) {
      setError('Configurez votre clé API dans les Réglages pour organiser le sommaire.');
      return;
    }
    setError(null);
    setOrganizing(true);
    try {
      const s = await organizeBase(() => {});
      setStructure(s);
    } catch (err) {
      setError(`L'organisation a échoué. ${err?.message || ''}`);
    } finally {
      setOrganizing(false);
    }
  }

  if (!entries.length) {
    return (
      <div className="knowledge">
        <div className="capture-empty">
          <p>
            Votre base est encore vierge. Analysez vos premières captures dans
            l'onglet Captures : la documentation se construira ici, avec son
            sommaire.
          </p>
        </div>
      </div>
    );
  }

  const renderEntry = (e) => (
    <article key={e.id} className={`entry ${openId === e.id ? 'open' : ''}`}>
      <button
        type="button"
        className="entry-head"
        onClick={() => setOpenId(openId === e.id ? null : e.id)}
      >
        <span className="entry-type">{TYPE_LABELS[e.type] || 'Autre'}</span>
        <span className="entry-title">{e.title}</span>
        <span className="entry-chevron">{openId === e.id ? '−' : '+'}</span>
      </button>
      <p className="entry-summary">{e.summary}</p>
      {openId === e.id && editingId !== e.id && (
        <div className="entry-body">
          <div
            className="entry-details"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(e.details) }}
          />
          {e.notes && (
            <div className="entry-notes">
              <span className="entry-notes-label">📝 Notes personnelles</span>
              <div
                className="entry-details"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(e.notes) }}
              />
            </div>
          )}
          {e.tags?.length > 0 && (
            <div className="entry-tags">
              {e.tags.map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="entry-actions">
            <span className="entry-dates">
              Créée le {formatDate(e.createdAt)}
              {e.updatedAt !== e.createdAt &&
                ` · mise à jour le ${formatDate(e.updatedAt)}`}
            </span>
            <span className="entry-buttons">
              <button type="button" className="btn-link edit" onClick={() => startEdit(e)}>
                Modifier
              </button>
              <button type="button" className="btn-link" onClick={() => onDelete(e.id)}>
                Supprimer
              </button>
            </span>
          </div>
        </div>
      )}
      {editingId === e.id && form && (
        <div className="entry-body entry-form">
          <label className="field-label">Titre</label>
          <input
            className="field-input"
            value={form.title}
            onChange={(ev) => setForm({ ...form, title: ev.target.value })}
          />
          <div className="form-row">
            <div className="form-col">
              <label className="field-label">Module</label>
              <input
                className="field-input"
                value={form.module}
                onChange={(ev) => setForm({ ...form, module: ev.target.value })}
              />
            </div>
            <div className="form-col">
              <label className="field-label">Type</label>
              <select
                className="field-input"
                value={form.type}
                onChange={(ev) => setForm({ ...form, type: ev.target.value })}
              >
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="field-label">Résumé</label>
          <textarea
            className="field-input"
            rows={2}
            value={form.summary}
            onChange={(ev) => setForm({ ...form, summary: ev.target.value })}
          />
          <label className="field-label">
            Détails <span className="label-optional">— Markdown, peut être enrichi par les analyses futures</span>
          </label>
          <textarea
            className="field-input entry-form-details"
            rows={10}
            value={form.details}
            onChange={(ev) => setForm({ ...form, details: ev.target.value })}
          />
          <label className="field-label">
            Notes personnelles <span className="label-optional">— jamais modifiées par Claude</span>
          </label>
          <textarea
            className="field-input"
            rows={4}
            placeholder="Vos annotations, points de vigilance, questions ouvertes…"
            value={form.notes}
            onChange={(ev) => setForm({ ...form, notes: ev.target.value })}
          />
          <label className="field-label">Tags <span className="label-optional">— séparés par des virgules</span></label>
          <input
            className="field-input"
            value={form.tags}
            onChange={(ev) => setForm({ ...form, tags: ev.target.value })}
          />
          <div className="form-actions">
            <button
              type="button"
              className="btn-ghost tall"
              onClick={() => {
                setEditingId(null);
                setForm(null);
              }}
            >
              Annuler
            </button>
            <button type="button" className="btn-primary" onClick={() => saveEdit(e)}>
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </article>
  );

  return (
    <div className="knowledge">
      {notice && (
        <p className="analysis-notice">
          🌿 Analyse terminée : {notice.created} fiche{notice.created > 1 ? 's' : ''}{' '}
          créée{notice.created > 1 ? 's' : ''}, {notice.updated} mise
          {notice.updated > 1 ? 's' : ''} à jour.
          <button type="button" className="btn-link" onClick={onDismissNotice}>
            Fermer
          </button>
        </p>
      )}

      <div className="knowledge-toolbar">
        <input
          type="search"
          className="field-input knowledge-search"
          placeholder="Rechercher dans la base…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          className="btn-ghost tall"
          onClick={onOrganize}
          disabled={organizing}
        >
          {organizing ? 'Organisation…' : plan ? 'Réorganiser le sommaire' : 'Générer le sommaire'}
        </button>
      </div>
      {error && <p className="status ko">{error}</p>}

      {searchResults ? (
        <section className="module-group">
          <h2 className="module-title">
            {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''}
          </h2>
          {searchResults.map(renderEntry)}
        </section>
      ) : plan ? (
        <>
          <nav className="toc">
            <h2 className="toc-title">Sommaire</h2>
            <ol className="toc-list">
              {plan.map((ch) => (
                <li key={ch.num}>
                  <a href={`#chap-${ch.num}`}>
                    <span className="toc-num">{ch.num}.</span> {ch.title}
                  </a>
                  <ol>
                    {ch.sections.map((s) => (
                      <li key={s.num}>
                        <a href={`#sec-${s.num}`}>
                          <span className="toc-num">{s.num}</span> {s.title}
                        </a>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          </nav>
          {plan.map((ch) => (
            <section key={ch.num} className="chapter" id={`chap-${ch.num}`}>
              <h2 className="chapter-title">
                {ch.num}. {ch.title}
              </h2>
              {ch.sections.map((s) => (
                <div key={s.num} className="doc-section" id={`sec-${s.num}`}>
                  <h3 className="section-title">
                    {s.num} {s.title}
                  </h3>
                  {s.items.map(renderEntry)}
                </div>
              ))}
            </section>
          ))}
        </>
      ) : (
        // Pas encore de sommaire : regroupement simple par module.
        [...new Map(entries.map((e) => [e.module, true])).keys()].sort().map((module) => (
          <section key={module} className="module-group">
            <h2 className="module-title">{module}</h2>
            {entries.filter((e) => e.module === module).map(renderEntry)}
          </section>
        ))
      )}
    </div>
  );
}
