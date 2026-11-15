/**
 * Where guests' replies and photos go: the couple's invitation on Tiri, so they
 * see every RSVP and every photo in the Tiri app. The link name must match the
 * invitation's published link (tiri.et/i/<slug>).
 */
export const TIRI_API = import.meta.env.VITE_TIRI_API || 'https://selah-api-1g22.onrender.com/api';
export const TIRI_SLUG = import.meta.env.VITE_TIRI_SLUG || 'muluken-rediet';

const url = (path) => `${TIRI_API}/public/invitations/${encodeURIComponent(TIRI_SLUG)}/${path}`;

async function post(path, body) {
  const res = await fetch(url(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Records a reply. Returns { ok } (ok is false when replies are switched off). */
export function sendRsvp({ guestName, response, partySize, message }) {
  return post('rsvp', { guestName, response, partySize, message: message || undefined });
}

/** Sends one photo (a data URL). Returns { ok, reason } — reason 'closed' before the wedding day. */
export function sendPhoto({ guestName, photo, caption }) {
  return post('memories', { guestName, photo, caption: caption || undefined });
}

/** Shrinks a picked photo to at most 1600 px on its long side, as a JPEG data URL. */
export function shrinkPhoto(file, max = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(src);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(src);
      reject(new Error('not an image'));
    };
    img.src = src;
  });
}
