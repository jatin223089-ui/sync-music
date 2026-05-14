import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Zap, Headphones, Globe, ArrowRight,
  Users, Radio, Music2, Sparkles, Shield, Heart, ExternalLink,
} from 'lucide-react';
import WaveformBg from '../components/WaveformBg';
import Navbar from '../components/Navbar';
import BrandLogo from '../components/BrandLogo';
import { useRoom } from '../context/RoomContext';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
});

const features = [
  {
    icon: Zap,
    label: 'Sub-1ms Sync',
    title: 'Millisecond-accurate playback',
    desc: 'NTP-inspired clock synchronization keeps every device within 1ms of each other — imperceptible to human ears.',
    accent: 'var(--primary)',
  },
  {
    icon: Headphones,
    label: 'Spatial Audio',
    title: 'Positional listening experience',
    desc: 'Drag devices on a virtual map. Volume adjusts based on your position relative to the audio source.',
    accent: 'var(--secondary)',
  },
  {
    icon: Globe,
    label: 'Zero friction',
    title: 'Any device, any browser',
    desc: 'Works on phones, tablets, and desktops instantly. No account, no app download, no configuration.',
    accent: '#34D399',
  },
];

const steps = [
  { icon: Sparkles, title: 'Create a Room', desc: 'Get a unique 6-character room code in one click. No sign-up, no friction.' },
  { icon: Users,    title: 'Invite Friends', desc: 'Share the code or scan the QR — everyone joins from any device.' },
  { icon: Music2,   title: 'Play Together',  desc: 'The host queues tracks. Every listener hears the same moment simultaneously.' },
];

const ticker = [
  '< 1ms sync accuracy', 'No app required', 'Spatial audio', 'Open source',
  'Real-time chat', 'QR invite', 'Host controls', 'Works on any device',
];

export default function Home() {
  const navigate = useNavigate();
  const { setUserName, userName } = useRoom();
  const [code, setCode] = useState('');
  const [name, setName] = useState(userName || '');
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ activeRooms: 0, totalListeners: 0 });

  useEffect(() => {
    fetch('http://localhost:3001/api/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const handleJoin = () => {
    if (!name.trim()) { setError('Enter your name first'); return; }
    if (!code.trim()) { setError('Enter a room code'); return; }
    setError('');
    setUserName(name.trim());
    navigate(`/room/${code.trim().toUpperCase()}`);
  };

  const handleCreate = () => {
    if (!name.trim()) { setError('Enter your name to create a room'); return; }
    setError('');
    setUserName(name.trim());
    navigate('/room/new');
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] overflow-x-hidden">
      <Navbar />

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-5 pt-20 pb-12 overflow-hidden">

        {/* Ambient orbs */}
        <div className="orb orb-purple w-[700px] h-[700px] top-[-200px] left-[-200px] animate-orb-1 opacity-80" />
        <div className="orb orb-cyan   w-[500px] h-[500px] bottom-[-100px] right-[-100px] animate-orb-2 opacity-70" />
        <div className="orb orb-pink   w-[400px] h-[400px] top-[40%] right-[10%] animate-orb-1 opacity-50" style={{ animationDelay: '-6s' }} />

        <WaveformBg />

        {/* Radial vignette to focus center */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 55%, transparent 20%, var(--bg) 75%)' }}
        />

        <div className="relative z-10 max-w-3xl mx-auto text-center">

          {/* Built with love badge */}
          <motion.div {...fadeUp(0)} className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface)]/70 border border-[var(--border)] text-xs font-medium text-[var(--muted)] backdrop-blur-md">
              Built with <Heart size={11} className="text-red-400 fill-red-400 animate-heartbeat" /> for music lovers
            </span>
          </motion.div>

          {/* Badge */}
          <motion.div {...fadeUp(0.05)} className="inline-flex items-center gap-2.5 mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/25 text-xs font-medium" style={{ color: 'var(--primary)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
              Open source · Real-time sync
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
            </span>
          </motion.div>

          <motion.h1 {...fadeUp(0.12)} className="text-[clamp(2.8rem,8vw,5.5rem)] font-black leading-[1.05] tracking-[-0.03em] mb-6 text-[var(--text)]">
            Listen Together,
            <br />
            <span className="gradient-text">In Perfect Sync.</span>
          </motion.h1>

          <motion.p {...fadeUp(0.22)} className="text-lg sm:text-xl text-[var(--muted)] leading-relaxed mb-12 max-w-xl mx-auto">
            Synchronized music across every device — millisecond-accurate,
            no download required, completely free.
          </motion.p>

          {/* Join / Create card */}
          <motion.div
            {...fadeUp(0.30)}
            className="glass-lighter rounded-3xl p-6 sm:p-8 card-glow max-w-lg mx-auto text-left space-y-4"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider pl-1" style={{ color: 'var(--faint)' }}>
                Your name
              </label>
              <input
                className="w-full bg-[var(--bg-2)] border border-[var(--border)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--faint)] text-sm transition-all outline-none"
                placeholder="e.g. Alex"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider pl-1" style={{ color: 'var(--faint)' }}>
                Room code
              </label>
              <div className="flex gap-3">
                <input
                  className="flex-1 bg-[var(--bg-2)] border border-[var(--border)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--faint)] text-sm uppercase tracking-[0.25em] font-mono transition-all outline-none"
                  placeholder="ABC123"
                  value={code}
                  maxLength={6}
                  onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                />
                <button
                  onClick={handleJoin}
                  className="btn-primary px-5 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 whitespace-nowrap"
                >
                  Join <ArrowRight size={15} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-xs pl-1 flex items-center gap-1.5"
              >
                <span className="w-1 h-1 rounded-full bg-red-400" /> {error}
              </motion.p>
            )}

            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-[var(--border)]" />
              <span className="text-xs font-medium" style={{ color: 'var(--faint)' }}>or start fresh</span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>

            <button
              onClick={handleCreate}
              className="group w-full py-3.5 rounded-xl border border-[var(--border-2)] hover:border-[var(--primary)]/40 bg-[var(--surface)]/40 hover:bg-[var(--primary)]/8 text-[var(--muted)] hover:text-[var(--text)] text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200"
            >
              <span className="w-5 h-5 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--primary) 20%, transparent)', color: 'var(--primary)' }}>+</span>
              Create New Room
              <ArrowRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
            </button>
          </motion.div>

          {/* Live stats pills */}
          <motion.div {...fadeUp(0.42)} className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/8 border border-emerald-500/20 text-sm">
              <Radio size={13} className="text-emerald-400" />
              <span className="text-[var(--muted)]"><strong className="text-emerald-400 font-semibold">{stats.activeRooms}</strong> rooms live</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm" style={{ background: 'color-mix(in srgb, var(--primary) 8%, transparent)', borderColor: 'color-mix(in srgb, var(--primary) 20%, transparent)', borderWidth: '1px', borderStyle: 'solid' }}>
              <Users size={13} style={{ color: 'var(--primary)' }} />
              <span className="text-[var(--muted)]"><strong style={{ color: 'var(--primary)' }} className="font-semibold">{stats.totalListeners}</strong> listening now</span>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <div className="w-px h-10 bg-gradient-to-b from-transparent via-[var(--faint)] to-[var(--primary)]/40" />
          <div className="w-1 h-1 rounded-full bg-[var(--primary)]/40" />
        </motion.div>
      </section>

      {/* ═══════════════════ TICKER ═══════════════════ */}
      <div className="border-y border-[var(--border)]/60 py-3.5 overflow-hidden bg-[var(--surface)]/40">
        <div className="flex animate-ticker whitespace-nowrap">
          {[...ticker, ...ticker].map((t, i) => (
            <span key={i} className="inline-flex items-center gap-3 px-5 text-xs font-medium" style={{ color: 'var(--faint)' }}>
              <span className="w-1 h-1 rounded-full bg-[var(--primary)]/50" />
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ═══════════════════ FEATURES ═══════════════════ */}
      <section id="features" className="py-28 px-5">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.55 }}
            className="text-center mb-16"
          >
            <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: 'var(--primary)' }}>Features</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 text-[var(--text)]">
              Built for the{' '}
              <span className="gradient-text">listening experience</span>
            </h2>
            <p className="text-[var(--muted)] max-w-md mx-auto leading-relaxed">
              Every detail is designed to make group listening feel like you're in the same room.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.5 }}
                className="relative rounded-2xl p-6 bg-[var(--surface)] border transition-all duration-300 group hover:-translate-y-1.5"
                style={{
                  borderColor: 'var(--border)',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = `color-mix(in srgb, ${f.accent} 40%, transparent)`}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {/* Accent bg gradient */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-30 pointer-events-none"
                  style={{ background: `linear-gradient(to bottom, color-mix(in srgb, ${f.accent} 10%, transparent), transparent)` }}
                />
                <div className="relative z-10">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: `color-mix(in srgb, ${f.accent} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${f.accent} 25%, transparent)` }}
                  >
                    <f.icon size={20} style={{ color: f.accent }} strokeWidth={2} />
                  </div>

                  <span
                    className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-3"
                    style={{ background: `color-mix(in srgb, ${f.accent} 12%, transparent)`, color: f.accent }}
                  >
                    {f.label}
                  </span>

                  <h3 className="font-bold text-[var(--text)] text-[15px] mb-2 leading-snug">{f.title}</h3>
                  <p className="text-[var(--muted)] text-sm leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
      <section className="py-28 px-5 relative overflow-hidden">
        <div className="orb orb-purple w-[600px] h-[600px] top-[-100px] right-[-200px] opacity-30 pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: 'var(--secondary)' }}>How it works</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4 text-[var(--text)]">
              Up and running in <span className="gradient-text">30 seconds</span>
            </h2>
            <p className="text-[var(--muted)]">No accounts. No downloads. Just music.</p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-6 relative">
            <div className="hidden sm:block absolute top-10 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-[var(--primary)]/0 via-[var(--primary)]/30 to-[var(--primary)]/0" />
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="flex flex-col items-center text-center"
              >
                <div className="relative mb-6">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 15%, transparent), color-mix(in srgb, var(--secondary) 15%, transparent))',
                      border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)',
                    }}
                  >
                    <s.icon size={26} style={{ color: 'var(--primary)' }} strokeWidth={1.5} />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-white text-[10px] font-black flex items-center justify-center shadow-lg" style={{ background: 'var(--primary)', boxShadow: '0 4px 12px color-mix(in srgb, var(--primary) 30%, transparent)' }}>
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-bold text-[var(--text)] text-[15px] mb-2">{s.title}</h3>
                <p className="text-[var(--muted)] text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ TRUST STATS ═══════════════════ */}
      <div className="py-10 px-5 border-y border-[var(--border)]/50 bg-[var(--surface)]/30">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: '< 1ms', label: 'Sync accuracy' },
            { value: '∞',     label: 'Devices per room' },
            { value: '0',     label: 'Downloads needed' },
            { value: '100%',  label: 'Free forever' },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <span className="text-3xl font-black gradient-text">{s.value}</span>
              <span className="text-xs font-medium" style={{ color: 'var(--faint)' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════ CTA ═══════════════════ */}
      <section className="py-28 px-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto relative"
        >
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[var(--primary)]/15 to-[var(--secondary)]/8 blur-xl" />
          <div className="relative glass-lighter rounded-3xl p-10 sm:p-14 text-center border card-glow" style={{ borderColor: 'color-mix(in srgb, var(--primary) 20%, transparent)' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl" style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-d))', boxShadow: '0 12px 30px color-mix(in srgb, var(--primary) 30%, transparent)' }}>
              <Music2 size={26} className="text-white" strokeWidth={1.5} />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3 text-[var(--text)]">Ready to sync up?</h2>
            <p className="text-[var(--muted)] mb-8 max-w-sm mx-auto leading-relaxed">
              Create a room, share the code, and start listening together — free, instant, no sign-up.
            </p>
            <button
              onClick={handleCreate}
              className="btn-primary px-10 py-4 rounded-xl font-bold text-base inline-flex items-center gap-2.5"
            >
              <Sparkles size={16} strokeWidth={2} />
              Create a Room — it's free
            </button>
            <div className="flex items-center justify-center gap-4 mt-6 text-xs" style={{ color: 'var(--faint)' }}>
              <span className="flex items-center gap-1.5"><Shield size={11} /> No account needed</span>
              <span className="w-1 h-1 rounded-full" style={{ background: 'var(--faint)' }} />
              <span className="flex items-center gap-1.5"><Zap size={11} /> Ready in seconds</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="relative border-t border-[var(--border)]/60 py-12 px-5 bg-[var(--surface)]/30">
        <div className="max-w-5xl mx-auto">
          {/* Top row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-3">
              <BrandLogo size={36} />
              <div>
                <p className="font-bold text-sm text-[var(--text)]">sync.music</p>
                <p className="text-[10px]" style={{ color: 'var(--faint)' }}>Open source · Free forever</p>
              </div>
            </div>

            <div className="flex gap-5 text-xs" style={{ color: 'var(--faint)' }}>
              <a href="/about" className="hover:text-[var(--text)] transition-colors">About</a>
              <a href="/#features" className="hover:text-[var(--text)] transition-colors">Features</a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--text)] transition-colors flex items-center gap-1">GitHub <ExternalLink size={9} /></a>
            </div>
          </div>

          {/* Built with love divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-6 inline-flex items-center gap-2 text-sm font-medium bg-[var(--bg)] text-[var(--muted)]">
                Built with
                <Heart
                  size={15}
                  className="text-red-400 fill-red-400 animate-heartbeat"
                />
                for music lovers everywhere
              </span>
            </div>
          </div>

          {/* Bottom copyright */}
          <p className="text-center text-[10px] mt-6" style={{ color: 'var(--faint)' }}>
            © {new Date().getFullYear()} sync.music — All rights reserved
          </p>
        </div>
      </footer>
    </div>
  );
}
