import Anthropic from '@anthropic-ai/sdk';
import { getApiKey, getModel } from './settings.js';

// La clé appartient à l'utilisateur et ne quitte son navigateur que vers
// l'API Anthropic — d'où dangerouslyAllowBrowser, assumé pour une app 100 % locale.
export function makeClient() {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Aucune clé API configurée.');
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

// Vérifie la clé sans consommer de tokens (simple listing des modèles).
export async function testConnection() {
  const client = makeClient();
  await client.models.list();
  return true;
}

export { getModel };
