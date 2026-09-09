// Rendu Markdown minimal et sûr : titres, gras, listes, code, tableaux.
export function renderMarkdown(md) {
  const esc = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = esc(md || '').split('\n');
  const out = [];
  let table = [];

  const flushTable = () => {
    if (!table.length) return;
    const rows = table.filter((r) => !/^\s*\|?[\s|:-]+\|?\s*$/.test(r));
    const html = rows
      .map((r, i) => {
        const cells = r
          .split('|')
          .map((c) => c.trim())
          .filter((c, j, a) => !(c === '' && (j === 0 || j === a.length - 1)));
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
    const l = line;
    if (/^###\s/.test(l)) out.push(`<h4>${l.slice(4)}</h4>`);
    else if (/^##\s/.test(l)) out.push(`<h4>${l.slice(3)}</h4>`);
    else if (/^#\s/.test(l)) out.push(`<h4>${l.slice(2)}</h4>`);
    else if (/^\s*[-*]\s/.test(l)) out.push(`<li>${l.replace(/^\s*[-*]\s/, '')}</li>`);
    else if (/^\s*\d+\.\s/.test(l)) out.push(`<li>${l.replace(/^\s*\d+\.\s/, '')}</li>`);
    else if (l.trim() === '') out.push('<br/>');
    else out.push(`<p>${l}</p>`);
  }
  flushTable();
  return out
    .join('')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}
