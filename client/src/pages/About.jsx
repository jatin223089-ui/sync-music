import { motion } from 'framer-motion';
import { Zap, Clock, Wifi, Shield, Code2, Heart } from 'lucide-react';
import Navbar from '../components/Navbar';

const techPoints = [
  {
    icon: Clock,
    title: 'NTP-inspired Time Sync',
    desc: 'Before joining a room, each client performs multiple round-trip measurements to the server. The median offset is calculated and used to schedule audio events on a shared timeline, yielding sub-5ms synchronization in typical network conditions.',
  },
  {
    icon: Zap,
    title: 'Web Audio API Scheduling',
    desc: 'Instead of calling play() directly, Beatsync uses AudioContext.currentTime to schedule audio start precisely. This hardware-level scheduling bypasses JavaScript\'s event loop jitter, giving us consistent millisecond accuracy.',
  },
  {
    icon: Wifi,
    title: 'Socket.io Real-time Events',
    desc: 'All playback control (play, pause, seek, track change) is relayed through a central Socket.io server. Each event carries a server timestamp so listeners can calculate their exact position on the shared timeline.',
  },
  {
    icon: Shield,
    title: 'Drift Correction',
    desc: 'Every 10 seconds, each client checks its playback position against the server\'s expected position. If drift exceeds 500ms, the audio is silently corrected — listeners never notice a glitch.',
  },
];

export default function About() {
  return (
    <div className="page-ambient ai-app min-h-screen overflow-x-hidden">
      <div className="bg-mesh fixed inset-0 z-0 pointer-events-none opacity-50" aria-hidden />
      <div className="relative z-[1]">
        <div className="orb orb-purple w-[min(100vw,520px)] h-[min(100vw,520px)] top-[-100px] left-[-150px] animate-orb-1 opacity-[0.3] pointer-events-none fixed" />
        <div className="orb orb-cyan w-[400px] h-[400px] bottom-[15%] right-[-100px] animate-orb-2 opacity-[0.22] pointer-events-none fixed" />

        <Navbar />

        <section className="pt-[calc(5.5rem+env(safe-area-inset-top,0px))] pb-14 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center depth-root">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-[11px] font-semibold mb-6 bg-[color-mix(in_srgb,var(--primary)_11%,transparent)] border border-[color-mix(in_srgb,var(--primary)_26%,transparent)] text-[var(--primary)] tracking-tight"
            >
              <Code2 size={14} className="shrink-0" /> Open source project
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl sm:text-5xl font-extrabold mb-5 text-[var(--text)] tracking-tight"
            >
              How <span className="gradient-text">Beatsync</span> works
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-base sm:text-lg text-[var(--muted)] leading-relaxed"
            >
              Beatsync solves a deceptively hard problem: making two browsers play the same audio at the
              exact same moment, even across different devices, networks, and hardware clocks.
            </motion.p>
          </div>
        </section>

        <section className="py-14 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="ai-section-kicker text-center mb-10" style={{ color: 'var(--primary)' }}>The technology</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {techPoints.map((t, i) => (
                <motion.div
                  key={t.title}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="ai-feature-card h-full"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 surface-3d !p-0 border-0"
                    style={{ background: 'color-mix(in srgb, var(--primary) 14%, transparent)' }}
                  >
                    <t.icon size={20} style={{ color: 'var(--primary)' }} />
                  </div>
                  <h3 className="font-bold text-[var(--text)] mb-2 text-[15px]">{t.title}</h3>
                  <p className="text-[var(--muted)] text-sm leading-relaxed">{t.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="ai-section-kicker text-center mb-10">Sync flow</h2>
            <div className="ai-panel-tight p-5 sm:p-6 font-mono-ui text-[10px] sm:text-xs overflow-x-auto text-[var(--muted)] border border-[color-mix(in_srgb,var(--border)_70%,transparent)]">
              <pre className="leading-7 whitespace-pre">{`
  Client A (Host)          Server              Client B (Listener)
  ──────────────           ──────              ───────────────────
  NTP measure ──────────► receive/send ◄────────── NTP measure
       ▼                       ▼                        ▼
  calculate offset       store offset            calculate offset
       │                       │                        │
  [user presses Play]          │                        │
       │                       │                        │
  emit play event ─────────► broadcast ──────────────► receive
  + serverTime T               │                  schedule at T
       │                       │                        │
  AudioContext                 │                  AudioContext
  .start(T - offset)           │                  .start(T - offset)
       │                       │                        │
  ◄────────────── both play at same wall-clock time ───────────►
            `}</pre>
            </div>
          </div>
        </section>

        <section className="py-14 px-4 sm:px-6 pb-20">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="ai-panel p-7 sm:p-9 text-center panel-lift"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto surface-3d !p-0"
                style={{ background: 'color-mix(in srgb, var(--secondary) 14%, transparent)' }}
              >
                <Shield size={24} style={{ color: 'var(--secondary)' }} />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-3 text-[var(--text)]">Self-hosting</h2>
              <p className="text-[var(--muted)] mb-6 max-w-md mx-auto text-sm leading-relaxed">
                Beatsync is fully open source. Run your own instance with a single Node.js command — ideal
                for private listening parties or local network use.
              </p>
              <div
                className="rounded-xl p-4 font-mono-ui text-left text-[11px] sm:text-sm inline-block w-full max-w-lg surface-3d border-0"
                style={{ color: 'var(--muted)' }}
              >
                <span style={{ color: 'var(--primary)' }}>$</span> git clone https://github.com/yourusername/sync-music<br />
                <span style={{ color: 'var(--primary)' }}>$</span> cd sync-music/server && npm install && npm start
              </div>
            </motion.div>
          </div>
        </section>

        <footer
          className="border-t py-10 px-4 text-center text-sm relative z-[1] bg-[color-mix(in_srgb,var(--surface)_25%,transparent)]"
          style={{ borderColor: 'color-mix(in srgb, var(--border) 65%, transparent)', color: 'var(--faint)' }}
        >
          <div className="flex flex-wrap items-center justify-center gap-1.5 mb-2 font-medium text-[var(--muted)]">
            <span>Built with</span>
            <Heart size={13} className="text-red-400 fill-red-400 animate-heartbeat" />
            <span>for music lovers everywhere</span>
          </div>
          <p className="font-mono-ui text-xs uppercase tracking-wider">Beatsync — Free &amp; open source</p>
        </footer>
      </div>
    </div>
  );
}
