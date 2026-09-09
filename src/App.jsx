import { useState } from 'react';
import SettingsView from './features/settings/SettingsView.jsx';
import CapturesView from './features/captures/CapturesView.jsx';
import KnowledgeView from './features/knowledge/KnowledgeView.jsx';
import AskView from './features/ask/AskView.jsx';

const ICONS = {
  captures: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h3l2-2.5h6L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  ),
  knowledge: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6c-2-1.5-4.5-2-7.5-2v14c3 0 5.5.5 7.5 2 2-1.5 4.5-2 7.5-2V4c-3 0-5.5.5-7.5 2Z" />
      <path d="M12 6v14" />
    </svg>
  ),
  ask: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 0 1-8 8H4l2.3-2.7A8 8 0 1 1 21 12Z" />
      <path d="M9.5 10.5c0-1.4 1.1-2.5 2.5-2.5s2.5 1 2.5 2.3c0 1.6-2.5 1.9-2.5 3.2" />
      <circle cx="12" cy="16.5" r="0.5" fill="currentColor" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
    </svg>
  ),
};

const TABS = [
  { id: 'captures', label: 'Captures' },
  { id: 'knowledge', label: 'Connaissances' },
  { id: 'ask', label: 'Ask' },
  { id: 'settings', label: 'Réglages' },
];

const CONTENT = {
  captures: {
    title: 'Capturez, en toute sérénité',
    text: "Photographiez les écrans du logiciel à documenter. Claude en extrait le texte et la structure, pour que vous restiez concentré sur l'essentiel.",
  },
  knowledge: {
    title: 'Votre savoir, cultivé avec soin',
    text: 'Écrans, règles de gestion, workflows, EDB et user stories — une base de connaissances organique, organisée et toujours à portée de main.',
  },
  ask: {
    title: 'Conversez avec votre documentation',
    text: 'Posez vos questions en langage naturel. Claude répond à partir de la connaissance que vous avez récoltée.',
  },
  settings: {
    title: 'Un espace qui vous ressemble',
    text: "Clé API Anthropic, choix du modèle, import et export de vos données. Tout reste sur votre appareil — rien ne part dans le cloud sans votre accord.",
  },
};

export default function App() {
  const [tab, setTab] = useState('captures');
  const [analysisNotice, setAnalysisNotice] = useState(null);
  const c = CONTENT[tab];

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg className="brand-mark" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="2.2" />
            <circle cx="16" cy="16" r="5.5" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="16" cy="16" r="1.8" fill="currentColor" />
          </svg>
          <span className="brand-name">Vault</span>
        </div>
        <nav className="nav-desktop">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`nav-link ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="main">
        <section className="hero compact">
          <h1 className="hero-title">{c.title}</h1>
          <p className="hero-text">{c.text}</p>
        </section>
        {tab === 'settings' && <SettingsView />}
        {tab === 'captures' && (
          <CapturesView
            onAnalyzed={(result) => {
              setAnalysisNotice(result);
              setTab('knowledge');
            }}
          />
        )}
        {tab === 'knowledge' && (
          <KnowledgeView
            notice={analysisNotice}
            onDismissNotice={() => setAnalysisNotice(null)}
          />
        )}
        {tab === 'ask' && <AskView />}
      </main>

      <nav className="nav-mobile">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`nav-mobile-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="nav-mobile-icon">{ICONS[t.id]}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

