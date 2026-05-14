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
    desc: 'Instead of calling play() directly, sync.music uses AudioContext.currentTime to schedule audio start precisely. This hardware-level scheduling bypasses JavaScript\'s event loop jitter, giving us consistent millisecond accuracy.',
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
    <div className="min-h-screen bg-[var(--bg)] relative overflow-hidden">
      <div className="orb orb-purple w-[600px] h-[600px] top-[-100px] left-[-150px] animate-orb-1 opacity-30 pointer-events-none" />
      <div className="orb orb-cyan w-[400px] h-[400px] bottom-[20%] right-[-100px] animate-orb-2 opacity-25 pointer-events-none" />

      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm mb-6 border"
            style={{
              background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
              borderColor: 'color-mix(in srgb, var(--primary) 30%, transparent)',
              color: 'var(--primary)',
            }}
          >
            <Code2 size={14} /> Open Source Project
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-black mb-6 text-[var(--text)]"
          >
            How <span className="gradient-text">sync.music</span> works
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-lg text-[var(--muted)] leading-relaxed"
          >
            sync.music solves a deceptively hard problem: making two browsers play the same audio at the
            exact same moment, even across different devices, networks, and hardware clocks.
          </motion.p>
        </div>
      </section>

      {/* Tech breakdown */}
      <section className="py-16 px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-10 text-center text-[var(--text)]">The Technology</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {techPoints.map((t, i) => (
              <motion.div
                key={t.title}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="glass rounded-2xl p-6 border"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'color-mix(in srgb, var(--primary) 18%, transparent)' }}
                >
                  <t.icon size={20} style={{ color: 'var(--primary)' }} />
                </div>
                <h3 className="font-bold text-[var(--text)] mb-2">{t.title}</h3>
                <p className="text-[var(--muted)] text-sm leading-relaxed">{t.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Sync diagram */}
      <section className="py-16 px-4 relative z-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-10 text-center text-[var(--text)]">Sync flow</h2>
          <div className="glass rounded-2xl p-6 border font-mono text-xs sm:text-sm overflow-x-auto"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
          >
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

      {/* Self host */}
      <section className="py-16 px-4 relative z-10">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="glass rounded-2xl p-8 border text-center"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto"
              style={{ background: 'color-mix(in srgb, var(--secondary) 18%, transparent)' }}
            >
              <Shield size={24} style={{ color: 'var(--secondary)' }} />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-[var(--text)]">Self-hosting</h2>
            <p className="text-[var(--muted)] mb-6 max-w-md mx-auto text-sm leading-relaxed">
              sync.music is fully open source. Run your own instance with a single Node.js command — ideal
              for private listening parties or local network use.
            </p>
            <div className="rounded-xl p-4 font-mono text-sm text-left inline-block border"
              style={{ background: 'var(--surface)', color: 'var(--muted)', borderColor: 'var(--border)' }}
            >
              <span style={{ color: 'var(--primary)' }}>$</span> git clone https://github.com/yourusername/sync-music<br />
              <span style={{ color: 'var(--primary)' }}>$</span> cd sync-music/server && npm install && npm start
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 text-center text-sm relative z-10"
        style={{ borderColor: 'var(--border)', color: 'var(--faint)' }}
      >
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <span>Built with</span>
          <Heart size={13} className="text-red-400 fill-red-400 animate-heartbeat" />
          <span>for music lovers everywhere</span>
        </div>
        <p>sync.music — Free & Open Source</p>
      </footer>
    </div>
  );
}
