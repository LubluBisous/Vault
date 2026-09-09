import { makeClient, getModel } from './claude.js';
import { dataUrlToApiSource } from './image.js';
import { listEntries } from './db.js';

const SYSTEM_PROMPT = `Tu es un expert en documentation fonctionnelle de logiciels, au service d'un Business Analyst.

On te fournit des captures d'écran d'un logiciel métier, ainsi que la BASE DE CONNAISSANCES EXISTANTE. Ta mission :
1. Extraire tout le texte visible et comprendre la structure de chaque écran.
2. Comparer avec la base existante : chaque écran capturé correspond-il à une fiche déjà connue ?
3. Produire des opérations de mise à jour de la base, en français, professionnelles et concises.

Réponds UNIQUEMENT avec un tableau JSON (aucun texte avant ou après), où chaque opération a cette forme :
{
  "action": "update" | "create",
  "id": "identifiant de la fiche existante (obligatoire si action=update, absent sinon)",
  "title": "nom court et précis de l'écran, du processus ou de la règle",
  "module": "module ou domaine fonctionnel",
  "type": "ecran | regle | workflow | donnees | autre",
  "summary": "résumé en 1 à 2 phrases",
  "details": "description structurée en Markdown : rôle de l'écran, champs et leur signification, actions possibles, règles de gestion visibles, messages, navigation",
  "tags": ["mots-clés", "pertinents"]
}

Consignes ESSENTIELLES pour la cohérence de la base :
- Si une capture montre un écran/sujet déjà documenté, choisis "update" avec l'id de la fiche : fournis alors la fiche COMPLÈTE FUSIONNÉE (tout le contenu existant encore valable + les nouveautés). Ne perds jamais d'information existante encore valide ; corrige ce que la nouvelle capture contredit.
- Réutilise EXACTEMENT les noms de modules existants quand le sujet s'y rattache ; ne crée un nouveau module que pour un domaine réellement nouveau.
- Ne crée pas de doublon : en cas de doute entre update et create, préfère update de la fiche la plus proche.
- Une fiche par écran distinct ; fiches séparées de type "regle" ou "workflow" pour les règles de gestion ou enchaînements notables.
- Sois factuel : ne décris que ce qui est visible ou raisonnablement déductible. Signale les zones illisibles.
- Utilise des tableaux Markdown pour les listes de champs (colonne | signification | observations).`;

function buildBaseContext(entries) {
  if (!entries.length) {
    return 'BASE DE CONNAISSANCES EXISTANTE : vide (première analyse — toutes les opérations seront "create").';
  }
  const modules = [...new Set(entries.map((e) => e.module))];
  const fiches = entries
    .map(
      (e) =>
        `### id: ${e.id}\ntitre : ${e.title}\nmodule : ${e.module}\ntype : ${e.type}\nrésumé : ${e.summary}\ndétails :\n${e.details}`
    )
    .join('\n\n');
  return `MODULES EXISTANTS : ${modules.join(' | ')}\n\nBASE DE CONNAISSANCES EXISTANTE (${entries.length} fiches) :\n\n${fiches}`;
}

function extractJson(text) {
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

const VALID_TYPES = ['ecran', 'regle', 'workflow', 'donnees', 'autre'];

// Analyse un lot de captures en tenant compte de la base existante.
// Retourne { entries, created, updated } ; entries = fiches à enregistrer (put).
export async function analyzeCaptures(captures, onProgress = () => {}) {
  const client = makeClient();
  const model = getModel();
  const existing = await listEntries();
  const byId = new Map(existing.map((e) => [e.id, e]));

  const content = [
    ...captures.map((c, i) => [
      { type: 'text', text: `Capture ${i + 1} :` },
      { type: 'image', source: dataUrlToApiSource(c.dataUrl) },
    ]),
    {
      type: 'text',
      text: `Analyse ces ${captures.length} capture(s), compare avec la base existante, et produis les opérations JSON (update/create).`,
    },
  ].flat();

  onProgress('Envoi à Claude et analyse en cours…');

  const stream = client.messages.stream({
    model,
    max_tokens: 16000,
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: buildBaseContext(existing) },
    ],
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

  let created = 0;
  let updated = 0;
  const entries = raw
    .filter((e) => e && e.title)
    .map((e) => {
      const prev = e.action === 'update' && e.id ? byId.get(e.id) : null;
      if (prev) updated += 1;
      else created += 1;
      return {
        id: prev ? prev.id : crypto.randomUUID(),
        createdAt: prev ? prev.createdAt : now,
        updatedAt: now,
        title: String(e.title),
        module: String(e.module || prev?.module || 'Général'),
        type: VALID_TYPES.includes(e.type) ? e.type : prev?.type || 'autre',
        summary: String(e.summary || prev?.summary || ''),
        details: String(e.details || prev?.details || ''),
        tags: Array.isArray(e.tags) ? e.tags.map(String).slice(0, 10) : prev?.tags || [],
        captureIds: [...new Set([...(prev?.captureIds || []), ...captureIds])],
      };
    });

  return { entries, created, updated };
}
