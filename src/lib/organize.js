import { makeClient, getModel } from './claude.js';
import { listEntries, saveMeta, getMeta } from './db.js';

const SYSTEM_PROMPT = `Tu es un expert en documentation fonctionnelle. On te fournit l'index des fiches d'une base de connaissances décrivant un logiciel métier.

Ta mission : organiser ces fiches en un plan de documentation professionnel, tel qu'on le trouverait dans un dossier de spécifications — du général vers le particulier.

Réponds UNIQUEMENT avec un objet JSON (aucun texte avant ou après) :
{
  "chapters": [
    {
      "title": "titre du chapitre",
      "sections": [
        { "title": "titre de la section", "entryIds": ["id1", "id2"] }
      ]
    }
  ]
}

Consignes :
- Chaque fiche apparaît EXACTEMENT UNE FOIS, via son id exact.
- Chapitres = grands domaines fonctionnels ; sections = sous-catégories cohérentes.
- Ordre de lecture logique : vue d'ensemble et référentiels d'abord, processus métier ensuite, règles et cas particuliers après.
- Titres courts, professionnels, en français.
- Vise 3 à 8 chapitres ; regroupe plutôt que d'émietter.`;

// Organise la base en chapitres/sections. Retourne la structure enregistrée.
export async function organizeBase(onProgress = () => {}) {
  const entries = await listEntries();
  if (!entries.length) return null;

  const index = entries
    .map(
      (e) =>
        `- id: ${e.id} | titre: ${e.title} | module: ${e.module} | type: ${e.type} | résumé: ${e.summary}`
    )
    .join('\n');

  onProgress('Organisation du sommaire…');
  const client = makeClient();
  const stream = client.messages.stream({
    model: getModel(),
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Index des fiches (${entries.length}) :\n${index}\n\nProduis le plan JSON.`,
      },
    ],
  });
  const response = await stream.finalMessage();
  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('Plan illisible.');
  const parsed = JSON.parse(t.slice(start, end + 1));

  const validIds = new Set(entries.map((e) => e.id));
  const seen = new Set();
  const chapters = (parsed.chapters || [])
    .map((ch) => ({
      title: String(ch.title || 'Chapitre'),
      sections: (ch.sections || [])
        .map((s) => ({
          title: String(s.title || 'Section'),
          entryIds: (s.entryIds || []).filter((id) => {
            if (!validIds.has(id) || seen.has(id)) return false;
            seen.add(id);
            return true;
          }),
        }))
        .filter((s) => s.entryIds.length),
    }))
    .filter((ch) => ch.sections.length);

  // Les fiches oubliées par le plan restent visibles en fin de sommaire.
  const orphans = entries.filter((e) => !seen.has(e.id)).map((e) => e.id);
  if (orphans.length) {
    chapters.push({
      title: 'Autres éléments',
      sections: [{ title: 'Non classés', entryIds: orphans }],
    });
  }

  const structure = { id: 'structure', chapters, updatedAt: Date.now() };
  await saveMeta(structure);
  return structure;
}

export function getStructure() {
  return getMeta('structure');
}
