// Préparation des images avant envoi à Claude : redimensionnement et
// compression JPEG pour réduire la latence et le coût API.
// 1568 px de grand côté = optimum vision de Claude (au-delà, l'API réduit elle-même).

const MAX_DIM = 1568;
const JPEG_QUALITY = 0.85;

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function resizeDataUrl(dataUrl, maxDim = MAX_DIM, quality = JPEG_QUALITY) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      // Fond blanc : les PNG transparents deviennent lisibles en JPEG.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error("Impossible de lire l'image."));
    img.src = dataUrl;
  });
}

// dataUrl -> {media_type, data} pour un bloc image de l'API Anthropic.
export function dataUrlToApiSource(dataUrl) {
  const [head, data] = dataUrl.split(',');
  const mediaType = head.match(/data:(.*?);/)?.[1] || 'image/jpeg';
  return { type: 'base64', media_type: mediaType, data };
}
