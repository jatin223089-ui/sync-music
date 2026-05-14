/**
 * Canonical public site origin for invite links / QR codes.
 * Set VITE_PUBLIC_SITE_URL in production (e.g. https://your-app.vercel.app) so QR
 * always opens the live site even if generated from a preview URL.
 */
export function getPublicSiteOrigin() {
  const raw = import.meta.env.VITE_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '');
  if (raw) {
    try {
      return new URL(raw.startsWith('http') ? raw : `https://${raw}`).origin;
    } catch {
      /* fall through */
    }
  }
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

export function getRoomInviteUrl(roomCode) {
  const code = String(roomCode ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const base = getPublicSiteOrigin().replace(/\/+$/, '');
  if (!base || !code) return `${base}/`;
  // `/?join=` always serves `/` (index.html) on static hosts — no SPA rewrite required for cold opens / QR.
  // `/join/:code` and `/room/:code` still work after deploy thanks to client/vercel.json rewrites.
  return `${base}/?join=${encodeURIComponent(code)}`;
}

/** REST / Socket base — upgrade http→https when the page is served over https (iOS Safari mixed-content). */
export function getBackendBaseUrl() {
  let url = (import.meta.env.VITE_SERVER_URL || 'http://localhost:3001').replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http:')) {
    url = `https:${url.slice('http:'.length)}`;
  }
  return url;
}
