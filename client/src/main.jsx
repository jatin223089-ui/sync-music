import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

registerSW({
  immediate: true,
  onRegisteredSW(swUrl, r) {
    if (!r?.update) return
    /* Pick up new deploys quickly while a tab stays open (PWA / long sessions). */
    const iv = setInterval(() => {
      r.update().catch(() => {})
    }, 60 * 1000)
    window.addEventListener('beforeunload', () => clearInterval(iv), { once: true })
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
