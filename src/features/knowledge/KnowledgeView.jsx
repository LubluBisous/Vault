import { useEffect, useMemo, useState } from 'react';
import { listEntries, deleteEntry } from '../../lib/db.js';

const TYPE_LABELS = {
  ecran: 'Écran',
  regle: 'Règle de gestion',
  workflow: 'Workflow',
  donnees: 'Données',
  autre: 'Autre',
};

// Rendu Markdown minimal et sûr : titres, gras, listes, tableaux.
function renderMarkdown(md) {
  const esc = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = esc(md).split('\n');
  const out = [];
  let table = [];

  const flushTable = () => {
    if (!table.length) return;
    const rows = table.filter((r) => !/^\s*\|?[\s|:-]+\|?\s*$/.test(r));
    const html = rows
      .map((r, i) => {
        const cells = r.split('|').map((c) => c.trim()).filter((c, j, a) => !(c === '' && (j === 0 || j === a.length - 1)));
        const tag = i === 0 ? 'th' : 'td';
        return `<tr>${cells.map((c) => `<${tag}>${c}</${tag}>`).join('')}</tr>`;
      })
      .join('');
    out.push(`<div class="md-table-wrap"><table>${html}</table></div>`);
    table = [];
  };

  for (const line of lines) {
    if (line.includes('|') && line.trim().startsWith('|')) {
      table.push(line);
      continue;
    }
    flushTable();
    let l = line;
    if (/^###\s/.test(l)) out.push(`<h4>${l.slice(4)}</h4>`);
    else if (/^##\s/.test(l)) out.push(`<h4>${l.slice(3)}</h4>`);
    else if (/^#\s/.test(l)) out.push(`<h4>${l.slice(2)}</h4>`);
    else if (/^\s*[-*]\s/.test(l)) out.push(`<li>${l.replace(/^\s*[-*]\s/, '')}</li>`);
    else if (l.trim() === '') out.push('<br/>');
    else out.push(`<p>${l}</p>`);
  }
  flushTable();
  return out
    .join('')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

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
