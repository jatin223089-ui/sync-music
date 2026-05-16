import { useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Volume2, VolumeX, Music2,
  Lock, Sparkles, Plus,
} from 'lucide-react';
import { formatTime } from '../utils/formatTime';

const SPOTIFY_GREEN = '#1DB954';

function ProgressSegment({
  currentTime, duration, progress, playbackControls, onSeek, variant = 'default',
}) {
  const light = variant === 'mobileLight';
  return (
    <div className={`flex items-center gap-2 sm:gap-3 w-full ${light ? 'px-1' : 'px-1'}`}>
      <span
        className={`text-[11px] font-medium tabular-nums shrink-0 ${light ? 'w-10 text-white/75' : 'w-9 text-right'}`}
        style={light ? undefined : { color: 'var(--faint)' }}
      >
        {formatTime(currentTime)}
      </span>
      <div
        className={`flex-1 relative rounded-full min-w-0 ${light ? 'h-0.5' : 'h-[3px]'}`}
        style={{ background: light ? 'rgba(255,255,255,0.2)' : 'var(--border)' }}
      >
        <div
          className="absolute h-full rounded-full transition-all duration-100"
          style={{
            background: light ? '#ffffff' : 'var(--primary)',
            width: `${progress}%`,
          }}
        />
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={(e) => playbackControls && onSeek(Number(e.target.value))}
          disabled={!playbackControls}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
        />
      </div>
      <span
        className={`text-[11px] font-medium tabular-nums shrink-0 ${light ? 'w-10 text-white/75' : 'w-9'}`}
        style={light ? undefined : { color: 'var(--faint)' }}
      >
        {formatTime(duration)}
      </span>
    </div>
  );
}

function TransportCluster({
  isPlaying, playbackControls, onPlay, onPause, onNext, onPrev,
  playIconLarge, repeatUiOn, onRepeatToggle, compact,
  tone = 'theme',
}) {
  const gap = compact ? 'gap-4' : playIconLarge ? 'gap-6' : 'gap-4';
  const sz = compact ? 18 : playIconLarge ? 22 : 20;
  const szSm = compact ? 16 : playIconLarge ? 17 : 16;
  const playSz = compact ? 22 : playIconLarge ? 22 : 20;
  const btnPlay = compact ? 'w-14 h-14' : playIconLarge ? 'w-16 h-16' : 'w-12 h-12';

  const isDark = tone === 'dark';
  const shuffleDis = isDark ? 'text-white/35' : '';
  const shuffleDisStyle = !isDark ? { color: 'var(--faint)' } : undefined;
  const nav = isDark ? 'text-white/45 hover:text-white/80 disabled:opacity-20' : 'text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-25';

  return (
    <div className={`flex items-center justify-center ${gap}`}>
      <button
        type="button"
        disabled
        title="Shuffle is coming soon"
        className={`transition-all disabled:opacity-25 shrink-0 ${shuffleDis}`}
        style={shuffleDisStyle}
      >
        <Shuffle size={szSm} strokeWidth={2} />
      </button>

      <button type="button" onClick={onPrev} disabled={!playbackControls} className={`transition-colors shrink-0 ${nav}`}>
        <SkipBack size={sz} strokeWidth={1.8} fill="currentColor" />
      </button>

      <button
        type="button"
        onClick={isPlaying ? onPause : onPlay}
        className={`relative rounded-full flex items-center justify-center transition-all duration-200 hover:scale-[1.04] shrink-0 ${btnPlay} bg-white text-black shadow-[0_8px_28px_rgba(0,0,0,0.35)]`}
      >
        {isPlaying
          ? <Pause size={playSz} fill="currentColor" strokeWidth={0} className="text-black" />
          : <Play size={playSz} fill="currentColor" strokeWidth={0} className="text-black ml-0.5" />
        }
      </button>

      <button type="button" onClick={onNext} disabled={!playbackControls} className={`transition-colors shrink-0 ${nav}`}>
        <SkipForward size={sz} strokeWidth={1.8} fill="currentColor" />
      </button>

      <button
        type="button"
        onClick={onRepeatToggle}
        title={repeatUiOn ? 'Repeat on (visual)' : 'Repeat off (visual)'}
        className="relative shrink-0 transition-colors"
        style={{
          color: repeatUiOn ? SPOTIFY_GREEN : (isDark ? 'rgba(255,255,255,0.35)' : 'var(--faint)'),
        }}
      >
        <Repeat size={szSm} strokeWidth={2} />
        {repeatUiOn && (
          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1DB954]" aria-hidden />
        )}
      </button>
    </div>
  );
}

function VolumeCluster({ muted, volume, volPct, setMuted, onVolume, prevVol, setPrevVol }) {
  return (
    <div className="flex items-center gap-2 min-w-0 max-w-[200px] w-full sm:w-auto justify-end">
      <button
        type="button"
        onClick={() => {
          if (muted) { onVolume(prevVol); } else { setPrevVol(volume); onVolume(0); }
          setMuted(!muted);
        }}
        className="text-[var(--faint)] hover:text-[var(--muted)] transition-colors shrink-0"
        aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'}
      >
        {muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
      </button>
      <div className="flex-1 relative h-[3px] rounded-full min-w-[72px] max-w-[120px]" style={{ background: 'var(--border)' }}>
        <div
          className="absolute h-full rounded-full transition-all duration-100 pointer-events-none"
          style={{
            background: 'var(--primary)',
            width: `${volPct}%`,
          }}
        />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={(e) => { setMuted(false); onVolume(Number(e.target.value)); }}
          aria-label="Volume"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <span className="text-[10px] w-8 text-right tabular-nums shrink-0" style={{ color: 'var(--faint)' }}>
        {Math.round(volPct)}
      </span>
    </div>
  );
}

export default function AudioPlayer({
  currentTrack, isPlaying, currentTime, duration,
  volume, onPlay, onPause, onSeek,
  onVolume, onNext, onPrev, isHost,
  /** When set, overrides `isHost` for transport + seek (e.g. listeners with “everyone” permissions). */
  canControlPlayback,
  needsTapToPlay, onTapToPlay,
  onOpenAddTracks,
}) {
  const [muted, setMuted] = useState(false);
  const [prevVol, setPrevVol] = useState(0.8);
  const [repeatUiOn, setRepeatUiOn] = useState(true);

  const playbackControls = canControlPlayback !== undefined && canControlPlayback !== null
    ? canControlPlayback
    : isHost;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volPct = (muted ? 0 : volume) * 100;

  const dockChrome = 'fixed bottom-0 left-0 right-0 z-[60] border-t border-[color-mix(in_srgb,var(--border)_70%,transparent)] backdrop-blur-md';
  const dockPadDesktop = 'pb-[calc(0.65rem+env(safe-area-inset-bottom,0px))] pt-2.5 px-3 sm:px-5 bg-[color-mix(in_srgb,var(--bg)_96%,var(--surface))]';
  const dockPadMobile = 'pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3 px-3 bg-black';

  const queueShortcutClass =
    'shrink-0 w-10 h-10 min-h-10 min-w-10 rounded-full flex items-center justify-center overflow-hidden btn-primary border border-white/15 shadow-lg transition-transform hover:brightness-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none';

  /* ─────────── EMPTY STATE ─────────── */
  if (!currentTrack) {
    return (
      <>
        <div className={`lg:hidden flex flex-col ${dockChrome} ${dockPadMobile}`}>
          <div className="flex items-center justify-between gap-3 min-h-[52px]">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-white/45 leading-snug">
                {isHost ? 'Add a track from the Music tab' : 'Waiting for the host…'}
              </p>
            </div>
            <button
              type="button"
              className={queueShortcutClass}
              aria-label={isHost ? 'Open Music tab to add tracks' : 'Open Music tab'}
              disabled={!onOpenAddTracks}
              onClick={() => onOpenAddTracks?.()}
            >
              <Sparkles size={18} strokeWidth={2} aria-hidden />
            </button>
          </div>
          {isHost && onOpenAddTracks && (
            <button type="button" onClick={onOpenAddTracks} className="mt-2 w-full py-2.5 rounded-xl text-xs font-bold btn-primary">
              <Plus size={16} className="inline mr-1.5 align-text-bottom" strokeWidth={2.5} />
              Add tracks
            </button>
          )}
        </div>

        <div className={`hidden lg:flex ${dockChrome} ${dockPadDesktop} items-center justify-center min-h-[64px]`}>
          <p className="text-xs font-medium text-[var(--muted)]">
            {isHost ? 'No track playing · Add audio from the queue' : 'Waiting for the host to queue a track…'}
          </p>
        </div>
      </>
    );
  }

  /* ─────────── ACTIVE PLAYER ─────────── */
  return (
    <>
      {/* Mobile dock — screenshot-style */}
      <div className={`lg:hidden flex flex-col ${dockChrome} ${dockPadMobile} gap-3`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0 flex justify-center">
            <TransportCluster
              compact
              tone="dark"
              isPlaying={isPlaying}
              playbackControls={playbackControls}
              onPlay={onPlay}
              onPause={onPause}
              onNext={onNext}
              onPrev={onPrev}
              playIconLarge={false}
              repeatUiOn={repeatUiOn}
              onRepeatToggle={() => setRepeatUiOn((v) => !v)}
            />
          </div>
          <button
            type="button"
            className={queueShortcutClass}
            aria-label={isHost ? 'Open Music tab to add tracks' : 'Open Music tab'}
            disabled={!onOpenAddTracks}
            onClick={() => onOpenAddTracks?.()}
          >
            <Sparkles size={18} strokeWidth={2} aria-hidden />
          </button>
        </div>

        {needsTapToPlay && (
          <button type="button" onClick={onTapToPlay} className="w-full rounded-xl px-4 py-2.5 text-xs font-semibold btn-primary">
            Tap to enable audio
          </button>
        )}

        {!playbackControls && (
          <div className="flex items-center justify-center gap-2 text-[10px] rounded-lg px-3 py-2 text-white/45 bg-white/5 border border-white/10">
            <Lock size={11} />
            Host controls playback
          </div>
        )}

        <ProgressSegment
          variant="mobileLight"
          currentTime={currentTime}
          duration={duration}
          progress={progress}
          playbackControls={playbackControls}
          onSeek={onSeek}
        />
      </div>

      {/* Desktop dock */}
      <div className={`hidden lg:flex ${dockChrome} ${dockPadDesktop} flex-col gap-2.5`}>
        <div className="max-w-[1400px] w-full mx-auto">
          <ProgressSegment
            currentTime={currentTime}
            duration={duration}
            progress={progress}
            playbackControls={playbackControls}
            onSeek={onSeek}
          />
        </div>

        <div className="max-w-[1400px] w-full mx-auto flex flex-wrap items-center gap-4 min-h-[52px]">
          <div className="flex items-center gap-3 min-w-0 flex-[1_1_200px] max-w-md">
            <div
              className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border flex items-center justify-center"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
            >
              {currentTrack?.art ? (
                <img src={currentTrack.art} alt="" className="w-full h-full object-cover" />
              ) : (
                <Music2 size={20} style={{ color: 'var(--faint)' }} strokeWidth={1.5} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--text)] truncate leading-tight">{currentTrack.name}</p>
              <p className="text-[11px] text-[var(--muted)] truncate mt-0.5">{currentTrack.artist}</p>
            </div>
          </div>

          <div className="flex-[2_1_320px] flex justify-center order-last lg:order-none w-full lg:w-auto">
            <TransportCluster
              isPlaying={isPlaying}
              playbackControls={playbackControls}
              onPlay={onPlay}
              onPause={onPause}
              onNext={onNext}
              onPrev={onPrev}
              playIconLarge={false}
              repeatUiOn={repeatUiOn}
              onRepeatToggle={() => setRepeatUiOn((v) => !v)}
              compact={false}
            />
          </div>

          <div className="flex items-center gap-3 flex-[1_1_180px] justify-end ml-auto w-full sm:w-auto">
            <VolumeCluster
              muted={muted}
              volume={volume}
              volPct={volPct}
              setMuted={setMuted}
              onVolume={onVolume}
              prevVol={prevVol}
              setPrevVol={setPrevVol}
            />
          </div>
        </div>

        {(needsTapToPlay || !playbackControls) && (
          <div className="max-w-[1400px] w-full mx-auto flex flex-wrap gap-2 justify-center pb-1">
            {needsTapToPlay && (
              <button type="button" onClick={onTapToPlay} className="rounded-lg px-4 py-2 text-xs font-semibold btn-primary">
                Tap to enable audio
              </button>
            )}
            {!playbackControls && (
              <div className="flex items-center gap-2 text-[11px] rounded-lg px-3 py-2" style={{ color: 'var(--faint)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <Lock size={11} />
                Host controls playback
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
