import { makeClient, getModel } from './claude.js';
import { listEntries } from './db.js';

const TYPE_LABELS = {
  ecran: 'Écran',
  regle: 'Règle de gestion',
  workflow: 'Workflow',
  donnees: 'Données',
  autre: 'Autre',
};

function buildSystem(entries) {
  const base = entries
    .map(
      (e) =>
        `## [${TYPE_LABELS[e.type] || 'Autre'}] ${e.title} (module : ${e.module})\n` +
        `${e.summary}\n\n${e.details}\n` +
        (e.notes ? `\nNotes personnelles du Business Analyst :\n${e.notes}\n` : '') +
        (e.tags?.length ? `Tags : ${e.tags.join(', ')}\n` : '')
    )
    .join('\n---\n\n');

  return (
    `Tu es l'assistant d'un Business Analyst. Tu réponds à ses questions sur le fonctionnement d'un logiciel métier, à partir de la base de connaissances ci-dessous (constituée par analyse de captures d'écran).\n\n` +
    `Consignes :\n` +
    `- Réponds en français, de façon précise et concise.\n` +
    `- Appuie-toi uniquement sur la base ; si l'information n'y figure pas, dis-le clairement et suggère quels écrans capturer pour compléter.\n` +
    `- Cite les fiches concernées par leur titre quand c'est utile.\n\n` +
    `# BASE DE CONNAISSANCES (${entries.length} fiches)\n\n${base}`
  );
}

// Pose une question en streaming. history = [{role, content}] complet, question incluse.
// onDelta(texteCumulé) est appelé au fil de la réponse. Retourne le texte final.
export async function askStream(history, onDelta) {
  const entries = await listEntries();
  const client = makeClient();

  const stream = client.messages.stream({
    model: getModel(),
    max_tokens: 4096,
    // cache_control : les questions suivantes relisent la base depuis le cache (~10x moins cher).
    system: [
      {
        type: 'text',
        text: buildSystem(entries),
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: history,
  });

  let acc = '';
  stream.on('text', (delta) => {
    acc += delta;
    onDelta(acc);
  });
  await stream.finalMessage();
  return acc;
}
