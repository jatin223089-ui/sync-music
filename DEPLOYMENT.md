# Deploy sync.music (frontend + backend)

The **client** is a static Vite SPA. The **server** must stay online for Socket.IO/WebSockets (`room:join`, playback sync, chat).

### Do **not** put the realtime server on Vercel

Standard Vercel deployments are **serverless / short-lived**. This project’s **`server/`** uses a long-lived **`http.Server` + Socket.IO**. Pointing **`VITE_SERVER_URL`** at a `*.vercel.app` Socket.IO deployment will typically fail with WebSocket/XHR errors. Host **`server/`** on Railway, Render, Fly, or another always-on Node host instead.

---

## Backend — Railway (recommended)

From the **`server/`** directory (Railway CLI installed and logged in):

```powershell
cd server
railway init --name your-sync-api
railway up
railway domain
```

Set **`ALLOWED_ORIGINS`** to your Vercel site origin(s), comma-separated (include `http://localhost:5173` for local dev).

---

## Backend — Render

1. Commit and push this repository.
2. [Render Dashboard](https://dashboard.render.com) → **Blueprints** → **New Blueprint Instance**.
3. Connect the repo and approve `render.yaml` (deploys `./server`).
4. When the deploy finishes, copy the service URL, e.g. `https://sync-music-server.onrender.com`.

**Environment variables (Render → your web service → Environment):**

| Name | Example | Notes |
|------|---------|--------|
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` | Comma-separated if multiple; use `*` only for debugging |
| `PORT` | _(leave unset)_ | Render sets this automatically |

**Health check:** Render uses `GET /health`.

---

## Frontend — Vercel

Project **Root Directory**: `client` (important).

**Build**

- Install: `npm install`
- Build: `npm run build`
- Output: `dist`

**Environment variables (set for Production & Preview builds):**

| Name | Example |
|------|---------|
| `VITE_SERVER_URL` | `https://<your-railway-or-render-host>` (HTTPS origin, **no** trailing slash) |
| `VITE_PUBLIC_SITE_URL` | `https://your-app.vercel.app` |

Rebuild after changing `VITE_*` (they are baked in at build time).

**CLI**

```powershell
cd client
npm install
npx vercel --prod
```

---

## Sanity checks

1. Backend: open `https://<your-render-host>/api/stats` — should return JSON.
2. Backend: open `https://<your-render-host>/health` → `ok`.
3. Frontend: open your Vercel URL → create room → DevTools Network should show WebSocket to your Render URL.

---

## Free tier caveat (Render)

On the Render free tier, the service spins down after idle. First visit after idle can take ~30–60s to wake the server — “Joining room” may show longer until Socket.IO reconnects.
