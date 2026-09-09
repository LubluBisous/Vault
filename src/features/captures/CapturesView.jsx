import { useEffect, useRef, useState } from 'react';
import { saveCapture, listCaptures, deleteCapture, clearCaptures } from '../../lib/db.js';
import { fileToDataUrl, resizeDataUrl } from '../../lib/image.js';

const canScreenCapture =
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia;

export default function CapturesView() {
  const [captures, setCaptures] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    listCaptures().then(setCaptures).catch(() => {});
  }, []);

  async function addCapture(dataUrl) {
    const resized = await resizeDataUrl(dataUrl);
    const capture = {
      id: crypto.randomUUID(),
      dataUrl: resized,
      createdAt: Date.now(),
    };
    await saveCapture(capture);
    setCaptures((prev) => [...prev, capture]);
  }

  async function onScreenCapture() {
    setError(null);
    setBusy(true);
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 5 },
        audio: false,
      });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      // Attendre un vrai frame, puis laisser le sélecteur de l'OS disparaître.
      await new Promise((resolve) => {
        const check = () => (video.videoWidth > 0 ? resolve() : setTimeout(check, 50));
        check();
      });
      await new Promise((r) => setTimeout(r, 400));
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      await addCapture(canvas.toDataURL('image/png'));
    } catch (err) {
      if (err?.name !== 'NotAllowedError') {
        setError("La capture a échoué. Réessayez ou importez une image.");
      }
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
      setBusy(false);
    }
  }

  async function onFilesSelected(e) {
    setError(null);
    setBusy(true);
    try {
      const files = [...(e.target.files || [])].filter((f) =>
        f.type.startsWith('image/')
      );
      for (const file of files) {
        const dataUrl = await fileToDataUrl(file);
        await addCapture(dataUrl);
      }
    } catch {
      setError("L'import a échoué pour au moins une image.");
    } finally {
      e.target.value = '';
      setBusy(false);
    }
  }

  async function onDelete(id) {
    await deleteCapture(id);
    setCaptures((prev) => prev.filter((c) => c.id !== id));
  }

  async function onClearAll() {
    await clearCaptures();
    setCaptures([]);
  }

  return (
    <div className="captures">
      <div className="capture-actions">
        {canScreenCapture && (
          <button
            type="button"
            className="btn-primary"
            onClick={onScreenCapture}
            disabled={busy}
          >
            {busy ? 'Un instant…' : "Capturer l'écran"}
          </button>
        )}
        <button
          type="button"
          className={canScreenCapture ? 'btn-ghost tall' : 'btn-primary'}
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
        >
          Importer des images
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={onFilesSelected}
        />
      </div>

      {!canScreenCapture && (
        <p className="capture-hint">
          Sur mobile, faites vos captures d'écran comme d'habitude puis
          importez-les depuis votre galerie.
        </p>
      )}
      {error && <p className="status ko">{error}</p>}

      {captures.length > 0 ? (
        <>
          <div className="capture-meta">
            <span>
              {captures.length} capture{captures.length > 1 ? 's' : ''} en attente
              d'analyse
            </span>
            <button type="button" className="btn-link" onClick={onClearAll}>
              Tout effacer
            </button>
          </div>
          <div className="capture-grid">
            {captures.map((c, i) => (
              <figure key={c.id} className="capture-thumb">
                <img src={c.dataUrl} alt={`Capture ${i + 1}`} loading="lazy" />
                <figcaption>
                  <span className="capture-num">{i + 1}</span>
                  <button
                    type="button"
                    className="thumb-rm"
                    onClick={() => onDelete(c.id)}
                    aria-label="Supprimer cette capture"
                  >
                    ✕
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="analyze-row">
            <button type="button" className="btn-primary" disabled>
              Analyser avec Claude — bientôt
            </button>
          </div>
        </>
      ) : (
        <div className="capture-empty">
          <p>
            Aucune capture pour l'instant. Vos captures restent sur cet appareil,
            en attendant leur analyse.
          </p>
        </div>
      )}
    </div>
  );
}
