import { useState } from 'react';

const TABS = [
  { id: 'captures', label: 'Captures', icon: '📷' },
  { id: 'knowledge', label: 'Connaissances', icon: '📚' },
  { id: 'ask', label: 'Ask', icon: '💬' },
  { id: 'settings', label: 'Réglages', icon: '⚙️' },
];

export default function App() {
  const [tab, setTab] = useState('captures');

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          <span className="app-logo">🔐</span> Vault
        </h1>
        <nav className="app-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span className="tab-icon">{t.icon}</span>
              <span className="tab-label">{t.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {tab === 'captures' && (
          <Placeholder
            title="Captures d'écran"
            text="Capturez des écrans du logiciel à documenter. Les captures seront analysées par Claude pour en extraire le texte et la structure."
          />
        )}
        {tab === 'knowledge' && (
          <Placeholder
            title="Base de connaissances"
            text="Les connaissances extraites, organisées par écran, module et processus : règles de gestion, workflows, EDB et user stories."
          />
        )}
        {tab === 'ask' && (
          <Placeholder
            title="Poser une question"
            text="Interrogez Claude sur le fonctionnement du logiciel documenté."
          />
        )}
        {tab === 'settings' && (
          <Placeholder
            title="Réglages"
            text="Clé API Anthropic, choix du modèle, import/export des données."
          />
        )}
      </main>
    </div>
  );
}

function Placeholder({ title, text }) {
  return (
    <section className="placeholder">
      <h2>{title}</h2>
      <p>{text}</p>
      <p className="soon">🚧 En construction</p>
    </section>
  );
}
