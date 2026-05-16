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

/**
 * True when the SPA is served from the public Internet but the build never set `VITE_SERVER_URL`.
 * The client would still try localhost (or upgraded https localhost), so the Socket.IO server is unreachable from visitors' browsers.
 */
export function isDeployedSiteMissingServerUrl() {
  if (typeof window === 'undefined') return false;
  const env = String(import.meta.env.VITE_SERVER_URL ?? '').trim();
  if (env) return false;
  const h = window.location.hostname;
  return h !== 'localhost' && h !== '127.0.0.1';
}

/**
 * Detects backends pointing at *.vercel.app / *.vercel.dev.
 * Persistent Socket.IO (this repo's `server/`) must run on a long-lived Node host (Railway, Render, Fly…),
 * not a standard Vercel serverless/static deployment — WebSockets and in-memory rooms will fail.
 */
export function isIncompatibleRealtimeHostForBuild() {
  try {
    const raw = String(import.meta.env.VITE_SERVER_URL ?? '').trim();
    if (!raw) return false;
    const origin = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const host = new URL(origin).hostname.toLowerCase();
    return host.endsWith('.vercel.app') || host.endsWith('.vercel.dev');
  } catch {
    return false;
  }
}

export function incompatibleRealtimeBuildMessage() {
  if (!isIncompatibleRealtimeHostForBuild()) return '';
  return (
    'VITE_SERVER_URL points at Vercel (*.vercel.app / *.vercel.dev), where this Socket.IO sync server cannot run reliably. '
    + 'Deploy the `server/` folder to Railway or Render instead, then set VITE_SERVER_URL to that HTTPS origin (see DEPLOYMENT.md). '
    + `(Current broken target: ${getBackendHint()}.)`
  );
}

/** Readable URL hint for troubleshooting (masked env at build time; safe to show). */
export function getBackendHint() {
  return getBackendBaseUrl();
}
