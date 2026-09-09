import { useEffect, useRef, useState } from 'react';
import { askStream } from '../../lib/ask.js';
import { listEntries } from '../../lib/db.js';
import { getApiKey } from '../../lib/settings.js';
import { renderMarkdown } from '../../lib/markdown.js';

export default function AskView() {
  const [entryCount, setEntryCount] = useState(null);
  const [messages, setMessages] = useState([]); // [{role, content}]
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    listEntries().then((e) => setEntryCount(e.length)).catch(() => setEntryCount(0));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  async function onSend() {
    const question = draft.trim();
    if (!question || streaming) return;
    if (!getApiKey()) {
      setError('Configurez votre clé API dans les Réglages avant de poser une question.');
      return;
    }
    setError(null);
    setDraft('');
    const history = [...messages, { role: 'user', content: question }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setStreaming(true);
    try {
      const finalText = await askStream(history, (acc) => {
        setMessages([...history, { role: 'assistant', content: acc }]);
      });
      setMessages([...history, { role: 'assistant', content: finalText }]);
    } catch (err) {
      const detail =
        err?.status === 401
          ? 'Clé API invalide — vérifiez les Réglages.'
          : err?.status === 429
            ? 'Limite de débit atteinte — réessayez dans une minute.'
            : err?.message || 'Erreur inconnue.';
      setError(`La question a échoué. ${detail}`);
      // Restaure l'état d'avant l'envoi pour permettre de réessayer.
      setMessages(messages);
      setDraft(question);
    } finally {
      setStreaming(false);
      textareaRef.current?.focus();
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  if (entryCount === 0) {
    return (
      <div className="ask">
        <div className="capture-empty">
          <p>
            Votre base de connaissances est vide — Claude n'aurait rien à
            raconter. Analysez d'abord quelques captures dans l'onglet Captures,
            puis revenez poser vos questions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ask">
      {entryCount != null && (
        <p className="ask-context">
          Claude s'appuie sur vos {entryCount} fiche{entryCount > 1 ? 's' : ''} de
          connaissances.
          {messages.length > 0 && (
            <button
              type="button"
              className="btn-link"
              onClick={() => setMessages([])}
            >
              Nouvelle conversation
            </button>
          )}
        </p>
      )}

      <div className="ask-thread">
        {messages.length === 0 && (
          <div className="ask-suggestions">
            <p>Quelques idées pour commencer :</p>
            <ul>
              <li>« Résume le fonctionnement général du logiciel »</li>
              <li>« Quelles sont les règles de gestion de l'écran X ? »</li>
              <li>« Quels écrans manquent pour compléter la documentation ? »</li>
            </ul>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.role === 'assistant' ? (
              <div
                className="msg-content entry-details"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(m.content || '…'),
                }}
              />
            ) : (
              <div className="msg-content">{m.content}</div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <p className="status ko">{error}</p>}

      <div className="ask-composer">
        <textarea
          ref={textareaRef}
          className="field-input ask-input"
          placeholder="Posez votre question sur le logiciel…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          disabled={streaming}
        />
        <button
          type="button"
          className="btn-primary"
          onClick={onSend}
          disabled={streaming || !draft.trim()}
        >
          {streaming ? '…' : 'Envoyer'}
        </button>
      </div>
    </div>
  );
}
