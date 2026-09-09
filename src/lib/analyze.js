import { makeClient, getModel } from './claude.js';
import { dataUrlToApiSource } from './image.js';

const SYSTEM_PROMPT = `Tu es un expert en documentation fonctionnelle de logiciels, au service d'un Business Analyst.

On te fournit des captures d'écran d'un logiciel métier. Ta mission :
1. Extraire tout le texte visible et comprendre la structure de chaque écran.
2. Produire des fiches de connaissances professionnelles, claires et concises, en français.

Réponds UNIQUEMENT avec un tableau JSON (aucun texte avant ou après), où chaque fiche a cette forme :
{
  "title": "nom court et précis de l'écran, du processus ou de la règle",
  "module": "module ou domaine fonctionnel (déduis-le du contexte, ex. Facturation, Référentiel clients)",
  "type": "ecran | regle | workflow | donnees | autre",
  "summary": "résumé en 1 à 2 phrases",
  "details": "description structurée en Markdown : rôle de l'écran, champs et leur signification, actions possibles, règles de gestion visibles, messages, navigation",
  "tags": ["mots-clés", "pertinents"]
}

Consignes :
- Une fiche par écran distinct ; ajoute des fiches séparées de type "regle" ou "workflow" quand tu identifies des règles de gestion ou des enchaînements notables.
- Sois factuel : ne décris que ce qui est visible ou raisonnablement déductible. Signale les zones illisibles.
- Utilise des tableaux Markdown pour les listes de champs (colonne | signification | observations).`;

function extractJson(text) {
  // Retire d'éventuelles clôtures de code et isole le tableau JSON.
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('[');
  const end = t.lastIndexOf(']');
  if (start === -1) throw new Error('Réponse sans JSON.');
  t = end > start ? t.slice(start, end + 1) : t.slice(start);
  try {
    return JSON.parse(t);
  } catch {
    // Réparation minimale d'un JSON tronqué : on coupe à la dernière fiche complète.
    const lastComplete = t.lastIndexOf('}');
    if (lastComplete > 0) {
      return JSON.parse(t.slice(0, lastComplete + 1) + ']');
    }
    throw new Error('JSON illisible dans la réponse.');
  }
}

// Analyse un lot de captures -> fiches de connaissances.
// onProgress(message) permet d'informer l'UI.
export async function analyzeCaptures(captures, onProgress = () => {}) {
  const client = makeClient();
  const model = getModel();

  const content = [
    ...captures.map((c, i) => [
      { type: 'text', text: `Capture ${i + 1} :` },
      { type: 'image', source: dataUrlToApiSource(c.dataUrl) },
    ]),
    {
      type: 'text',
      text: `Analyse ces ${captures.length} capture(s) et produis les fiches de connaissances au format JSON demandé.`,
    },
  ].flat();

  onProgress('Envoi à Claude et analyse en cours…');

  const stream = client.messages.stream({
    model,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content }],
  });

  stream.on('text', () => onProgress('Claude rédige les fiches…'));
  const response = await stream.finalMessage();

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  const raw = extractJson(text);
  const now = Date.now();
  const captureIds = captures.map((c) => c.id);

  return raw
    .filter((e) => e && e.title)
    .map((e) => ({
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      title: String(e.title),
      module: String(e.module || 'Général'),
      type: ['ecran', 'regle', 'workflow', 'donnees', 'autre'].includes(e.type)
        ? e.type
        : 'autre',
      summary: String(e.summary || ''),
      details: String(e.details || ''),
      tags: Array.isArray(e.tags) ? e.tags.map(String).slice(0, 10) : [],
      captureIds,
    }));
}
