import { useEffect, useMemo, useState } from 'react';
import { listEntries, deleteEntry } from '../../lib/db.js';
import { renderMarkdown } from '../../lib/markdown.js';

const TYPE_LABELS = {
  ecran: 'Écran',
  regle: 'Règle de gestion',
  workflow: 'Workflow',
  donnees: 'Données',
  autre: 'Autre',
};

export default function KnowledgeView() {
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    listEntries().then(setEntries).catch(() => {});
  }, []);

  const grouped = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = q
      ? entries.filter((e) =>
          [e.title, e.module, e.summary, e.details, ...(e.tags || [])]
            .join(' ')
            .toLowerCase()
            .includes(q)
        )
      : entries;
    const map = new Map();
    for (const e of filtered) {
      if (!map.has(e.module)) map.set(e.module, []);
      map.get(e.module).push(e);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [entries, search]);

  async function onDelete(id) {
    await deleteEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  if (!entries.length) {
    return (
      <div className="knowledge">
        <div className="capture-empty">
          <p>
            Votre base est encore vierge. Analysez vos premières captures dans
            l'onglet Captures : les fiches apparaîtront ici, organisées par
            module.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="knowledge">
      <input
        type="search"
        className="field-input knowledge-search"
        placeholder="Rechercher dans la base…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {grouped.map(([module, list]) => (
        <section key={module} className="module-group">
          <h2 className="module-title">{module}</h2>
          {list.map((e) => (
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
              {openId === e.id && (
                <div className="entry-body">
                  <div
                    className="entry-details"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(e.details) }}
                  />
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
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => onDelete(e.id)}
                    >
                      Supprimer cette fiche
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
