import Anthropic from '@anthropic-ai/sdk';
import { getApiKey, getModel, getWorkspaceId } from './settings.js';

// La clé appartient à l'utilisateur et ne quitte son navigateur que vers
// l'API Anthropic — d'où dangerouslyAllowBrowser, assumé pour une app 100 % locale.
export function makeClient() {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Aucune clé API configurée.');
  const workspaceId = getWorkspaceId();
  return new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
    // Les clés « organisation » non rattachées à un workspace exigent cet en-tête.
    ...(workspaceId && {
      defaultHeaders: { 'anthropic-workspace-id': workspaceId },
    }),
  });
}

// Vérifie la clé sans rien facturer : le comptage de tokens est gratuit
// et accepte toutes les clés (models.list exige un workspace pour certaines).
export async function testConnection() {
  const client = makeClient();
  await client.messages.countTokens({
    model: 'claude-haiku-4-5',
    messages: [{ role: 'user', content: 'ping' }],
  });
  return true;
}

export { getModel };
