// Réglages persistés localement (localStorage) — jamais synchronisés ni versionnés.

const KEY_API = 'vault_api_key';
const KEY_MODEL = 'vault_model';
const KEY_WORKSPACE = 'vault_workspace_id';
const KEY_CAPTURE_SURFACE = 'vault_capture_surface';

export const MODELS = [
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    tagline: 'Léger et rapide',
    detail: 'Idéal pour les analyses simples et les gros volumes.',
    price: '1 $ / 5 $ par million de tokens',
  },
  {
    id: 'claude-sonnet-5',
    name: 'Claude Sonnet 5',
    tagline: "L'équilibre juste",
    detail: 'Excellent rapport finesse / coût pour le quotidien.',
    price: '2 $ / 10 $ par million de tokens',
  },
  {
    id: 'claude-opus-5',
    name: 'Claude Opus 5',
    tagline: 'Toute la profondeur',
    detail: 'La plus grande finesse pour les écrans complexes.',
    price: '5 $ / 25 $ par million de tokens',
  },
];

export const DEFAULT_MODEL = 'claude-opus-5';

export function getApiKey() {
  try {
    return localStorage.getItem(KEY_API) || '';
  } catch {
    return '';
  }
}

export function setApiKey(key) {
  try {
    if (key) localStorage.setItem(KEY_API, key);
    else localStorage.removeItem(KEY_API);
  } catch {
    /* stockage indisponible (navigation privée) */
  }
}

export function getWorkspaceId() {
  try {
    return localStorage.getItem(KEY_WORKSPACE) || '';
  } catch {
    return '';
  }
}

export function setWorkspaceId(id) {
  try {
    if (id) localStorage.setItem(KEY_WORKSPACE, id);
    else localStorage.removeItem(KEY_WORKSPACE);
  } catch {
    /* stockage indisponible */
  }
}

// Surface de capture préférée : 'monitor' | 'window' | 'browser'.
export function getCaptureSurface() {
  try {
    const v = localStorage.getItem(KEY_CAPTURE_SURFACE);
    return ['monitor', 'window', 'browser'].includes(v) ? v : 'monitor';
  } catch {
    return 'monitor';
  }
}

export function setCaptureSurface(surface) {
  try {
    localStorage.setItem(KEY_CAPTURE_SURFACE, surface);
  } catch {
    /* stockage indisponible */
  }
}

export function getModel() {
  try {
    return localStorage.getItem(KEY_MODEL) || DEFAULT_MODEL;
  } catch {
    return DEFAULT_MODEL;
  }
}

export function setModel(model) {
  try {
    localStorage.setItem(KEY_MODEL, model);
  } catch {
    /* stockage indisponible */
  }
}
