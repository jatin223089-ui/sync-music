import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Zap, Headphones, Globe, ArrowRight,
  Users, Radio, Music2, Sparkles, Shield, Heart, ExternalLink,
} from 'lucide-react';
import WaveformBg from '../components/WaveformBg';
import Navbar from '../components/Navbar';
import BrandLogo from '../components/BrandLogo';
import { useRoom } from '../context/RoomContext';
import { getBackendBaseUrl } from '../utils/siteUrl';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
});

const featureGridClass = (i) => {
  if (i === 0) return 'md:col-span-4 md:row-span-2 min-h-[200px] md:min-h-[260px]';
  if (i === 1) return 'md:col-span-2 md:col-start-5 md:row-start-1';
  return 'md:col-span-2 md:col-start-5 md:row-start-2';
};

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
  { icon: Users, title: 'Invite Friends', desc: 'Share the code or scan the QR — everyone joins from any device.' },
  { icon: Music2, title: 'Play Together', desc: 'The host queues tracks. Every listener hears the same moment simultaneously.' },
];

const ticker = [
  '< 1ms sync accuracy', 'No app required', 'Spatial audio', 'Open source',
  'Real-time chat', 'QR invite', 'Host controls', 'Works on any device',
];

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUserName, userName } = useRoom();
  const [code, setCode] = useState('');
  const [name, setName] = useState(userName || '');
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ activeRooms: 0, totalListeners: 0 });

  useEffect(() => {
    const j = searchParams.get('join') || searchParams.get('code');
    if (!j) return;
    const normalized = j.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (normalized.length !== 6) return;
    navigate(`/room/${normalized}`, { replace: true });
  }, [searchParams, navigate]);

  useEffect(() => {
    fetch(`${getBackendBaseUrl()}/api/stats`)
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
    <div className="page-ambient min-h-[100dvh] overflow-x-hidden relative">
      <div className="relative z-[1]">
        <Navbar />

        {/* HERO */}
        <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-5 pt-[calc(5.25rem+env(safe-area-inset-top,0px))] pb-[calc(3rem+env(safe-area-inset-bottom,0px))] overflow-hidden">
          <div className="bg-mesh absolute inset-0 z-0" aria-hidden />
          <div className="orb orb-purple w-[min(100vw,520px)] h-[min(100vw,520px)] top-[-120px] left-[-140px] animate-orb-1 opacity-[0.38]" />
          <div className="orb orb-cyan w-[min(90vw,420px)] h-[min(90vw,420px)] bottom-[-80px] right-[-100px] animate-orb-2 opacity-[0.32]" />

          <WaveformBg />

          <div
            className="absolute inset-0 pointer-events-none z-[1]"
            style={{ background: 'radial-gradient(ellipse 72% 58% at 50% 52%, transparent 25%, var(--bg) 78%)' }}
          />

          <div className="depth-root relative z-10 w-full max-w-[min(100%,44rem)] mx-auto text-center min-w-0">
            <motion.div {...fadeUp(0)} className="flex flex-wrap justify-center gap-2 mb-8 px-1">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium text-[var(--muted)] border border-[color-mix(in_srgb,var(--border)_82%,transparent)] bg-[color-mix(in_srgb,var(--surface)_65%,transparent)] backdrop-blur-md max-w-full">
                Built with <Heart size={11} className="text-red-400 fill-red-400 inline shrink-0 animate-heartbeat" /> for music lovers
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-[11px] sm:text-xs font-semibold bg-[color-mix(in_srgb,var(--primary)_11%,transparent)] border border-[color-mix(in_srgb,var(--primary)_26%,transparent)] text-[var(--primary)] tracking-tight">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse shrink-0" />
                Open source · Real-time sync
              </span>
            </motion.div>

            <motion.h1 {...fadeUp(0.1)} className="text-[clamp(2rem,8.5vw,4.75rem)] font-extrabold leading-[1.06] tracking-[-0.035em] mb-5 text-[var(--text)] px-1 text-balance max-w-full">
              Listen together,
              <br />
              <span className="gradient-text">in perfect sync.</span>
            </motion.h1>

            <motion.p {...fadeUp(0.18)} className="text-[15px] sm:text-lg text-[var(--muted)] leading-relaxed mb-10 max-w-md mx-auto px-1 text-balance [overflow-wrap:anywhere]">
              Synchronized music across every device — millisecond-accurate,
              no download required, completely free.
            </motion.p>

            <motion.div
              {...fadeUp(0.26)}
              className="surface-3d panel-lift rounded-2xl sm:rounded-3xl p-6 sm:p-8 w-full max-w-lg min-w-0 mx-auto text-left space-y-4 pb-[max(1.5rem,calc(1rem+env(safe-area-inset-bottom,0px)))] card-glow"
            >
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.14em] pl-1 font-mono-ui" style={{ color: 'var(--faint)' }}>
                  Your name
                </label>
                <input
                  className="ui-input"
                  placeholder="e.g. Alex"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(''); }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.14em] pl-1 font-mono-ui" style={{ color: 'var(--faint)' }}>
                  Room code
                </label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                  <input
                    className="ui-input flex-1 min-w-0 uppercase tracking-[0.22em] font-mono-ui text-sm"
                    placeholder="ABC123"
                    value={code}
                    maxLength={6}
                    onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  />
                  <button
                    type="button"
                    onClick={handleJoin}
                    className="btn-primary w-full sm:w-auto justify-center px-5 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 whitespace-nowrap shrink-0"
                  >
                    Join <ArrowRight size={15} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-xs pl-1 flex items-center gap-1.5 font-mono-ui"
                >
                  <span className="w-1 h-1 rounded-full bg-red-400 shrink-0" /> {error}
                </motion.p>
              )}

              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-[10px] font-mono-ui uppercase tracking-wider" style={{ color: 'var(--faint)' }}>or start fresh</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>

              <button
                type="button"
                onClick={handleCreate}
                className="group w-full px-2 py-3.5 rounded-xl btn-ghost text-sm font-semibold flex items-center justify-center gap-2"
              >
                <span className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, var(--primary) 18%, transparent)', color: 'var(--primary)' }}>+</span>
                Create new room
                <ArrowRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all shrink-0" />
              </button>
            </motion.div>

            <motion.div {...fadeUp(0.36)} className="mt-8 grid grid-cols-2 gap-2 sm:gap-3 px-1 max-w-lg mx-auto w-full font-mono-ui">
              <div className="flex items-center justify-center gap-2 px-2 py-2.5 rounded-xl bg-emerald-500/8 border border-emerald-500/18 text-[11px] sm:text-sm">
                <Radio size={13} className="text-emerald-400 shrink-0" />
                <span className="text-[var(--muted)] text-left leading-tight">
                  <strong className="text-emerald-400 font-semibold tabular-nums">{stats.activeRooms}</strong>
                  <span className="hidden sm:inline"> rooms</span>
                </span>
              </div>
              <div
                className="flex items-center justify-center gap-2 px-2 py-2.5 rounded-xl text-[11px] sm:text-sm"
                style={{
                  background: 'color-mix(in srgb, var(--primary) 7%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--primary) 18%, transparent)',
                }}
              >
                <Users size={13} style={{ color: 'var(--primary)' }} className="shrink-0" />
                <span className="text-[var(--muted)] text-left leading-tight">
                  <strong style={{ color: 'var(--primary)' }} className="font-semibold tabular-nums">{stats.totalListeners}</strong>
                  <span className="hidden sm:inline"> listening</span>
                </span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* TICKER */}
        <div className="relative z-[1] border-y border-[color-mix(in_srgb,var(--border)_65%,transparent)] py-3 overflow-hidden bg-[color-mix(in_srgb,var(--surface)_45%,transparent)]">
          <div className="flex animate-ticker whitespace-nowrap font-mono-ui">
            {[...ticker, ...ticker].map((t, i) => (
              <span key={i} className="inline-flex items-center gap-3 px-5 text-[11px] font-medium" style={{ color: 'var(--faint)' }}>
                <span className="w-1 h-1 rounded-full bg-[var(--primary)]/45 shrink-0" />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* FEATURES — bento */}
        <section id="features" className="relative z-[1] py-24 sm:py-28 px-5">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55 }}
              className="text-center mb-14"
            >
              <p className="ai-section-kicker mb-3" style={{ color: 'var(--primary)' }}>Product</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 text-[var(--text)]">
                Built for the{' '}
                <span className="gradient-text">listening experience</span>
              </h2>
              <p className="text-[var(--muted)] max-w-md mx-auto leading-relaxed text-sm sm:text-base">
                Every detail is designed to make group listening feel like you are in the same room.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-6 md:grid-rows-2 gap-4 md:gap-5">
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className={`ai-feature-card relative overflow-hidden group ${featureGridClass(i)}`}
                >
                  <div
                    className="absolute inset-0 opacity-25 pointer-events-none"
                    style={{ background: `linear-gradient(155deg, color-mix(in srgb, ${f.accent} 18%, transparent), transparent 55%)` }}
                  />
                  <div className="relative z-10 h-full flex flex-col">
                    <div
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center mb-4 shrink-0"
                      style={{
                        background: `color-mix(in srgb, ${f.accent} 14%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${f.accent} 22%, transparent)`,
                      }}
                    >
                      <f.icon size={20} style={{ color: f.accent }} strokeWidth={2} />
                    </div>
                    <span
                      className="inline-flex w-fit text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-3 font-mono-ui"
                      style={{ background: `color-mix(in srgb, ${f.accent} 12%, transparent)`, color: f.accent }}
                    >
                      {f.label}
                    </span>
                    <h3 className="font-bold text-[var(--text)] text-[15px] sm:text-base mb-2 leading-snug">{f.title}</h3>
                    <p className="text-[var(--muted)] text-sm leading-relaxed flex-1">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="relative z-[1] py-24 sm:py-28 px-5 overflow-hidden">
          <div className="orb orb-purple w-[min(100vw,480px)] h-[min(100vw,480px)] top-[-80px] right-[-160px] opacity-[0.22] pointer-events-none" />
          <div className="max-w-4xl mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-14"
            >
              <p className="ai-section-kicker mb-3">Flow</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 text-[var(--text)]">
                Up and running in <span className="gradient-text">30 seconds</span>
              </h2>
              <p className="text-[var(--muted)] text-sm sm:text-base">No accounts. No downloads. Just music.</p>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-6 relative">
              <div className="hidden sm:block absolute top-10 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-[var(--primary)]/0 via-[var(--primary)]/25 to-[var(--primary)]/0" />
              {steps.map((s, i) => (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="relative mb-6">
                    <div
                      className="w-[4.5rem] h-[4.5rem] sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center surface-3d"
                    >
                      <s.icon size={24} style={{ color: 'var(--primary)' }} strokeWidth={1.75} className="sm:w-[26px] sm:h-[26px]" />
                    </div>
                    <span
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-white text-[10px] font-black flex items-center justify-center font-mono-ui shadow-md"
                      style={{
                        background: 'var(--primary)',
                        boxShadow: '0 4px 14px color-mix(in srgb, var(--primary) 28%, transparent)',
                      }}
                    >
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

        {/* STATS */}
        <div className="relative z-[1] py-10 px-5 border-y border-[color-mix(in_srgb,var(--border)_55%,transparent)] bg-[color-mix(in_srgb,var(--surface)_32%,transparent)]">
          <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 text-center font-mono-ui">
            {[
              { value: '< 1ms', label: 'Sync accuracy' },
              { value: '∞', label: 'Devices / room' },
              { value: '0', label: 'Downloads' },
              { value: '100%', label: 'Free forever' },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1">
                <span className="text-2xl sm:text-3xl font-extrabold gradient-text tabular-nums">{s.value}</span>
                <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--faint)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <section className="relative z-[1] py-24 sm:py-28 px-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-xl mx-auto relative"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[var(--primary)]/12 to-[var(--secondary)]/6 blur-2xl -z-10" />
            <div className="relative ai-panel rounded-2xl sm:rounded-3xl p-9 sm:p-12 text-center border border-[color-mix(in_srgb,var(--primary)_18%,var(--border))]">
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 btn-primary p-0 border-0"
                style={{ boxShadow: '0 10px 28px color-mix(in srgb, var(--primary) 26%, transparent)' }}
              >
                <Music2 size={26} className="text-white" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3 text-[var(--text)]">Ready to sync up?</h2>
              <p className="text-[var(--muted)] mb-8 max-w-sm mx-auto leading-relaxed text-sm sm:text-base">
                Create a room, share the code, and start listening together — free, instant, no sign-up.
              </p>
              <button
                type="button"
                onClick={handleCreate}
                className="btn-primary px-8 py-3.5 rounded-xl font-bold text-sm sm:text-base inline-flex items-center gap-2.5"
              >
                <Sparkles size={16} strokeWidth={2} />
                Create a room
              </button>
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-6 text-[11px] font-mono-ui" style={{ color: 'var(--faint)' }}>
                <span className="flex items-center gap-1.5"><Shield size={11} /> No account</span>
                <span className="w-1 h-1 rounded-full opacity-60" style={{ background: 'var(--faint)' }} />
                <span className="flex items-center gap-1.5"><Zap size={11} /> Seconds to start</span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* FOOTER */}
        <footer className="relative z-[1] border-t border-[color-mix(in_srgb,var(--border)_60%,transparent)] py-12 px-5 bg-[color-mix(in_srgb,var(--surface)_28%,transparent)]">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
              <div className="flex items-center gap-3">
                <BrandLogo size={36} />
                <div>
                  <p className="font-bold text-sm text-[var(--text)]">Beatsync</p>
                  <p className="text-[10px] font-mono-ui uppercase tracking-wider" style={{ color: 'var(--faint)' }}>Open source</p>
                </div>
              </div>
              <div className="flex gap-5 text-xs font-mono-ui" style={{ color: 'var(--faint)' }}>
                <a href="/about" className="hover:text-[var(--text)] transition-colors">About</a>
                <a href="/#features" className="hover:text-[var(--text)] transition-colors">Features</a>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--text)] transition-colors flex items-center gap-1">GitHub <ExternalLink size={9} /></a>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-6 inline-flex items-center gap-2 text-sm font-medium bg-[var(--bg)] text-[var(--muted)] rounded-full border border-[color-mix(in_srgb,var(--border)_70%,transparent)]">
                  Built with
                  <Heart
                    size={15}
                    className="text-red-400 fill-red-400 animate-heartbeat"
                  />
                  for listeners everywhere
                </span>
              </div>
            </div>
            <p className="text-center text-[10px] mt-6 font-mono-ui" style={{ color: 'var(--faint)' }}>
              © {new Date().getFullYear()} Beatsync
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
