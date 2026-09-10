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
  const [selectedId, setSelectedId] = useState(null);
  const [organizing, setOrganizing] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  // Mobile : true = arborescence visible, false = fiche visible.
  const [mobileList, setMobileList] = useState(true);

  useEffect(() => {
    listEntries().then(setEntries).catch(() => {});
    getStructure().then(setStructure).catch(() => {});
  }, []);

  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);
  const selected = selectedId ? byId.get(selectedId) : null;

  // Arborescence : plan de Claude si présent, sinon regroupement par module.
  const tree = useMemo(() => {
    if (structure?.chapters?.length) {
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
      const fresh = entries.filter((e) => !placed.has(e.id));
      if (fresh.length) {
        chapters.push({
          num: `${chapters.length + 1}`,
          title: 'À classer',
          sections: [
            { num: `${chapters.length + 1}.1`, title: 'Nouvelles fiches', items: fresh },
          ],
        });
      }
      if (chapters.length) return chapters;
    }
    const modules = [...new Set(entries.map((e) => e.module))].sort();
    return modules.map((m, i) => ({
      num: `${i + 1}`,
      title: m,
      sections: [
        { num: `${i + 1}.1`, title: '', items: entries.filter((e) => e.module === m) },
      ],
    }));
  }, [structure, byId, entries]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return entries.filter((e) =>
      [e.title, e.module, e.summary, e.details, e.notes || '', ...(e.tags || [])]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [entries, search]);

  function select(id) {
    setSelectedId(id);
    setEditing(false);
    setForm(null);
    setMobileList(false);
  }

  async function onDelete(id) {
    await deleteEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setSelectedId(null);
    setMobileList(true);
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

  function startEdit() {
    setForm({
      title: selected.title,
      module: selected.module,
      type: selected.type,
      summary: selected.summary,
      details: selected.details,
      notes: selected.notes || '',
      tags: (selected.tags || []).join(', '),
    });
    setEditing(true);
  }

  async function saveEdit() {
    const updated = {
      ...selected,
      title: form.title.trim() || selected.title,
      module: form.module.trim() || selected.module,
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
    setEditing(false);
    setForm(null);
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

  return (
    <div className="kb">
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
      {error && <p className="status ko">{error}</p>}

      <div className="kb-layout">
        <aside className={`kb-sidebar ${mobileList ? '' : 'mobile-hidden'}`}>
          <input
            type="search"
            className="field-input kb-search"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {searchResults ? (
            <nav className="kb-tree">
              <p className="kb-tree-caption">
                {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''}
              </p>
              <ul className="kb-items">
                {searchResults.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      className={`kb-item ${selectedId === e.id ? 'active' : ''}`}
                      onClick={() => select(e.id)}
                    >
                      {e.title}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          ) : (
            <nav className="kb-tree">
              {tree.map((ch) => (
                <div key={ch.num} className="kb-chapter">
                  <p className="kb-chapter-title">
                    <span className="toc-num">{ch.num}.</span> {ch.title}
                  </p>
                  {ch.sections.map((s) => (
                    <div key={s.num} className="kb-section">
                      {s.title && (
                        <p className="kb-section-title">
                          <span className="toc-num">{s.num}</span> {s.title}
                        </p>
                      )}
                      <ul className="kb-items">
                        {s.items.map((e) => (
                          <li key={e.id}>
                            <button
                              type="button"
                              className={`kb-item ${selectedId === e.id ? 'active' : ''}`}
                              onClick={() => select(e.id)}
                            >
                              {e.title}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </nav>
          )}

          <button
            type="button"
            className="btn-ghost tall kb-organize"
            onClick={onOrganize}
            disabled={organizing}
          >
            {organizing ? 'Organisation…' : 'Réorganiser le sommaire'}
          </button>
        </aside>

        <section className={`kb-main ${mobileList ? 'mobile-hidden' : ''}`}>
          <button
            type="button"
            className="btn-link kb-back"
            onClick={() => setMobileList(true)}
          >
            ← Sommaire
          </button>

          {!selected && (
            <div className="kb-placeholder">
              <p>Sélectionnez une fiche dans le sommaire pour la consulter.</p>
            </div>
          )}

          {selected && !editing && (
            <article className="kb-doc">
              <header className="kb-doc-head">
                <span className="entry-type">{TYPE_LABELS[selected.type] || 'Autre'}</span>
                <span className="kb-doc-module">{selected.module}</span>
              </header>
              <h2 className="kb-doc-title">{selected.title}</h2>
              <p className="kb-doc-summary">{selected.summary}</p>
              <div
                className="entry-details"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(selected.details) }}
              />
              {selected.notes && (
                <div className="entry-notes">
                  <span className="entry-notes-label">📝 Notes personnelles</span>
                  <div
                    className="entry-details"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(selected.notes) }}
                  />
                </div>
              )}
              {selected.tags?.length > 0 && (
                <div className="entry-tags">
                  {selected.tags.map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="entry-actions">
                <span className="entry-dates">
                  Créée le {formatDate(selected.createdAt)}
                  {selected.updatedAt !== selected.createdAt &&
                    ` · mise à jour le ${formatDate(selected.updatedAt)}`}
                </span>
                <span className="entry-buttons">
                  <button type="button" className="btn-link edit" onClick={startEdit}>
                    Modifier
                  </button>
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => onDelete(selected.id)}
                  >
                    Supprimer
                  </button>
                </span>
              </div>
            </article>
          )}

          {selected && editing && form && (
            <div className="entry-form kb-doc">
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
                Détails{' '}
                <span className="label-optional">
                  — Markdown, peut être enrichi par les analyses futures
                </span>
              </label>
              <textarea
                className="field-input entry-form-details"
                rows={12}
                value={form.details}
                onChange={(ev) => setForm({ ...form, details: ev.target.value })}
              />
              <label className="field-label">
                Notes personnelles{' '}
                <span className="label-optional">— jamais modifiées par Claude</span>
              </label>
              <textarea
                className="field-input"
                rows={4}
                placeholder="Vos annotations, points de vigilance, questions ouvertes…"
                value={form.notes}
                onChange={(ev) => setForm({ ...form, notes: ev.target.value })}
              />
              <label className="field-label">
                Tags <span className="label-optional">— séparés par des virgules</span>
              </label>
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
                    setEditing(false);
                    setForm(null);
                  }}
                >
                  Annuler
                </button>
                <button type="button" className="btn-primary" onClick={saveEdit}>
                  Enregistrer
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
