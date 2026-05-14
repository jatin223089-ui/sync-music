import { useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Volume2, VolumeX, Music2,
  Lock, Sparkles, Disc3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatTime } from '../utils/formatTime';
import WaveformVisualizer from './WaveformVisualizer';

export default function AudioPlayer({
  currentTrack, isPlaying, currentTime, duration,
  volume, analyserData, onPlay, onPause, onSeek,
  onVolume, onNext, onPrev, isHost,
}) {
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [muted, setMuted] = useState(false);
  const [prevVol, setPrevVol] = useState(0.8);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volPct   = (muted ? 0 : volume) * 100;

  const toggleMute = () => {
    if (muted) { onVolume(prevVol); } else { setPrevVol(volume); onVolume(0); }
    setMuted(!muted);
  };

  /* ─────────── EMPTY STATE ─────────── */
  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center gap-8 w-full max-w-sm mx-auto py-8">
        {/* Decorative empty disc */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          {/* Outer pulsing ring */}
          <div className="absolute inset-0 rounded-full animate-pulse-glow" style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--primary) 25%, transparent), transparent 70%)' }} />

          {/* Disc */}
          <div className="relative w-44 h-44 rounded-full flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle at 35% 35%, color-mix(in srgb, var(--surface-2) 90%, var(--primary)), var(--surface) 70%)',
              border: '1px solid var(--border)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            {/* Decorative rings */}
            {[0.82, 0.66, 0.50, 0.32].map((r) => (
              <div
                key={r}
                className="absolute rounded-full"
                style={{
                  width: `${r * 100}%`,
                  height: `${r * 100}%`,
                  border: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
                }}
              />
            ))}

            {/* Center icon */}
            <div className="relative z-10 w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 18%, transparent), color-mix(in srgb, var(--secondary) 12%, transparent))',
                border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)',
              }}
            >
              <Music2 size={20} style={{ color: 'var(--primary)' }} strokeWidth={1.5} />
            </div>
          </div>

          {/* Floating sparkle */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center"
          >
            <Sparkles size={14} style={{ color: 'var(--primary)' }} className="animate-glow-pulse" />
          </motion.div>
        </motion.div>

        {/* CTA text */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center space-y-2"
        >
          <h3 className="text-xl font-black tracking-tight text-[var(--text)]">Ready to play</h3>
          <p className="text-sm text-[var(--muted)] leading-relaxed max-w-xs">
            {isHost
              ? 'Add a track to the queue to start the listening session.'
              : 'Waiting for the host to add the first track…'}
          </p>
        </motion.div>

        {/* Helper card */}
        {isHost ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full"
          >
            <div className="rounded-2xl border p-4 flex items-center gap-3"
              style={{
                background: 'color-mix(in srgb, var(--primary) 6%, transparent)',
                borderColor: 'color-mix(in srgb, var(--primary) 22%, transparent)',
              }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-d))',
                  boxShadow: '0 4px 12px color-mix(in srgb, var(--primary) 30%, transparent)',
                }}
              >
                <Disc3 size={16} className="text-white" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[var(--text)]">You're the host</p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">Tap the + in the Queue to add tracks</p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2 text-[11px] text-[var(--faint)]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
            Synchronized · Ready for playback
          </motion.div>
        )}
      </div>
    );
  }

  /* ─────────── ACTIVE PLAYER ─────────── */
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto">

      {/* Vinyl / album art */}
      <div className="relative w-full flex items-center justify-center pt-2 pb-4">
        {/* Ambient glow behind art */}
        <div
          className={`absolute w-64 h-64 rounded-full blur-3xl pointer-events-none transition-opacity duration-700 ${isPlaying ? 'opacity-40' : 'opacity-15'}`}
          style={{ background: 'radial-gradient(circle, var(--primary) 0%, var(--secondary) 60%, transparent 100%)' }}
        />

        {/* Vinyl disc */}
        <div
          className={`relative w-48 h-48 rounded-full transition-all duration-700 ${isPlaying ? 'animate-spin-slow' : ''}`}
          style={{
            background: 'conic-gradient(from 0deg, var(--surface-3), var(--surface), var(--surface-3), var(--surface), var(--surface-3))',
            boxShadow: isPlaying
              ? '0 0 0 1px var(--border-2), 0 0 40px color-mix(in srgb, var(--primary) 25%, transparent), 0 20px 60px rgba(0,0,0,0.6)'
              : '0 0 0 1px var(--border), 0 10px 40px rgba(0,0,0,0.5)',
          }}
        >
          {/* Vinyl grooves */}
          {[0.85, 0.72, 0.60].map((r) => (
            <div
              key={r}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: `${r * 100}%`,
                height: `${r * 100}%`,
                border: '1px solid color-mix(in srgb, var(--text) 4%, transparent)',
              }}
            />
          ))}

          {/* Center label with art */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[58%] h-[58%] rounded-full overflow-hidden"
            style={{ border: '2px solid color-mix(in srgb, var(--border) 60%, transparent)', boxShadow: '0 2px 12px rgba(0,0,0,0.6)' }}
          >
            {currentTrack?.art ? (
              <img src={currentTrack.art} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 25%, transparent), color-mix(in srgb, var(--secondary) 20%, transparent))' }}
              >
                <Music2 size={28} style={{ color: 'var(--muted)' }} strokeWidth={1.5} />
              </div>
            )}
          </div>

          {/* Center hole */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
            style={{ background: 'var(--bg)', border: '1px solid var(--border-2)' }}
          />
        </div>

        {/* Pulse ring */}
        {isPlaying && (
          <div
            className="absolute w-48 h-48 rounded-full animate-pulse-ring"
            style={{ border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)', animationDuration: '2.4s' }}
          />
        )}
      </div>

      {/* Track info */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTrack.id || currentTrack.name}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="text-center w-full px-2"
        >
          <p className="font-bold text-[17px] text-[var(--text)] truncate leading-snug">{currentTrack.name}</p>
          <p className="text-[var(--muted)] text-sm mt-0.5 truncate">{currentTrack.artist}</p>
        </motion.div>
      </AnimatePresence>

      {/* Waveform */}
      <div className="w-full px-2">
        <WaveformVisualizer data={analyserData} isPlaying={isPlaying} />
      </div>

      {/* Progress */}
      <div className="w-full flex items-center gap-3 px-1">
        <span className="text-[11px] font-medium w-9 text-right tabular-nums" style={{ color: 'var(--faint)' }}>
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={(e) => isHost && onSeek(Number(e.target.value))}
          disabled={!isHost}
          className="flex-1"
          style={{
            background: `linear-gradient(to right, var(--primary) ${progress}%, var(--border) ${progress}%)`,
            height: '3px', borderRadius: '99px',
            WebkitAppearance: 'none', appearance: 'none',
          }}
        />
        <span className="text-[11px] font-medium w-9 tabular-nums" style={{ color: 'var(--faint)' }}>
          {formatTime(duration)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 w-full">
        <button
          onClick={() => setShuffle(!shuffle)}
          disabled={!isHost}
          className="transition-all disabled:opacity-30"
          style={{ color: shuffle ? 'var(--primary)' : 'var(--faint)' }}
        >
          <Shuffle size={17} strokeWidth={2} />
        </button>

        <button
          onClick={onPrev}
          disabled={!isHost}
          className="text-[var(--muted)] hover:text-[var(--text)] transition-colors disabled:opacity-30"
        >
          <SkipBack size={22} strokeWidth={1.8} fill="currentColor" />
        </button>

        <button
          onClick={isPlaying ? onPause : onPlay}
          className="relative w-16 h-16 rounded-full flex items-center justify-center text-white transition-all duration-200 btn-primary hover:scale-105"
        >
          {isPlaying
            ? <Pause size={22} fill="white" strokeWidth={0} />
            : <Play  size={22} fill="white" strokeWidth={0} className="ml-1" />
          }
          {isPlaying && (
            <span
              className="absolute inset-0 rounded-full animate-ping"
              style={{ border: '2px solid color-mix(in srgb, var(--primary) 40%, transparent)', animationDuration: '2s' }}
            />
          )}
        </button>

        <button
          onClick={onNext}
          disabled={!isHost}
          className="text-[var(--muted)] hover:text-[var(--text)] transition-colors disabled:opacity-30"
        >
          <SkipForward size={22} strokeWidth={1.8} fill="currentColor" />
        </button>

        <button
          onClick={() => setRepeat(!repeat)}
          disabled={!isHost}
          className="transition-all disabled:opacity-30"
          style={{ color: repeat ? 'var(--primary)' : 'var(--faint)' }}
        >
          <Repeat size={17} strokeWidth={2} />
        </button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-3 w-full px-1">
        <button onClick={toggleMute} className="text-[var(--faint)] hover:text-[var(--muted)] transition-colors">
          {muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
        <input
          type="range"
          min={0} max={1} step={0.01}
          value={muted ? 0 : volume}
          onChange={(e) => { setMuted(false); onVolume(Number(e.target.value)); }}
          className="flex-1"
          style={{
            background: `linear-gradient(to right, var(--primary) ${volPct}%, var(--border) ${volPct}%)`,
            height: '3px', borderRadius: '99px',
            WebkitAppearance: 'none', appearance: 'none',
          }}
        />
        <span className="text-[11px] w-8 text-right tabular-nums" style={{ color: 'var(--faint)' }}>
          {Math.round(volPct)}%
        </span>
      </div>

      {/* Host-only notice */}
      {!isHost && (
        <div className="flex items-center gap-2 text-[11px] rounded-xl px-4 py-2.5 w-full justify-center" style={{ color: 'var(--faint)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Lock size={11} />
          Host controls playback
        </div>
      )}
    </div>
  );
}
