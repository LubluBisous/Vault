import { useState } from 'react';
import { MODELS, getApiKey, setApiKey, getModel, setModel } from '../../lib/settings.js';
import { testConnection } from '../../lib/claude.js';

export default function SettingsView() {
  const [apiKey, setApiKeyState] = useState(getApiKey());
  const [model, setModelState] = useState(getModel());
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState(null); // {ok: bool, msg: string}
  const [testing, setTesting] = useState(false);

  function onKeyChange(e) {
    const v = e.target.value.trim();
    setApiKeyState(v);
    setApiKey(v);
    setStatus(null);
  }

  function onModelChange(id) {
    setModelState(id);
    setModel(id);
  }

  async function onTest() {
    setTesting(true);
    setStatus(null);
    try {
      await testConnection();
      setStatus({ ok: true, msg: 'Connexion réussie — votre clé est valide.' });
    } catch (err) {
      const detail =
        err?.status === 401
          ? 'Clé invalide ou révoquée.'
          : err?.message || 'Erreur inconnue.';
      setStatus({ ok: false, msg: `Échec de la connexion. ${detail}` });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="settings">
      <section className="panel">
        <h2 className="panel-title">Connexion à Claude</h2>
        <p className="panel-note">
          Votre clé reste dans votre navigateur, sur cet appareil. Elle n'est
          transmise qu'à l'API Anthropic, jamais ailleurs. Créez-la sur{' '}
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
            console.anthropic.com
          </a>
          .
        </p>
        <label className="field-label" htmlFor="api-key">
          Clé API Anthropic
        </label>
        <div className="key-row">
          <input
            id="api-key"
            className="field-input"
            type={showKey ? 'text' : 'password'}
            placeholder="sk-ant-…"
            value={apiKey}
            onChange={onKeyChange}
            autoComplete="off"
            spellCheck="false"
          />
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setShowKey((s) => !s)}
            aria-label={showKey ? 'Masquer la clé' : 'Afficher la clé'}
          >
            {showKey ? 'Masquer' : 'Afficher'}
          </button>
        </div>
        <div className="test-row">
          <button
            type="button"
            className="btn-primary"
            onClick={onTest}
            disabled={!apiKey || testing}
          >
            {testing ? 'Vérification…' : 'Tester la connexion'}
          </button>
          {status && (
            <span className={`status ${status.ok ? 'ok' : 'ko'}`}>{status.msg}</span>
          )}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Modèle</h2>
        <p className="panel-note">
          Choisissez l'équilibre entre finesse d'analyse et coût. Les prix
          indiqués sont entrée / sortie.
        </p>
        <div className="model-grid">
          {MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`model-card ${model === m.id ? 'selected' : ''}`}
              onClick={() => onModelChange(m.id)}
            >
              <span className="model-tagline">{m.tagline}</span>
              <span className="model-name">{m.name}</span>
              <span className="model-detail">{m.detail}</span>
              <span className="model-price">{m.price}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
