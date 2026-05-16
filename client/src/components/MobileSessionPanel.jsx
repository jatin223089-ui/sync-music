import {
  Users, Crown, Minus, Plus, Volume2, Send, QrCode, Timer,
} from 'lucide-react';
import ParticipantList from './ParticipantList';

const GREEN = '#1DB954';

export default function MobileSessionPanel({
  roomCode,
  onQrClick,
  offsetMs,
  rttMs,
  playbackPermissions,
  onPlaybackPermissionsChange,
  globalVolume,
  onGlobalVolumeChange,
  listeningNudgeMs,
  onListeningNudgeDelta,
  metronomePulse,
  onMetronomeTap,
  participants,
  myId,
  onUploadClick,
  showUpload,
  onLeave,
  isHost,
}) {
  const olMs = rttMs > 0 ? rttMs / 2 : 0;
  const permEveryone = playbackPermissions !== 'admins';

  return (
    <div className="w-full max-w-[min(100%,26rem)] mx-auto space-y-5 pb-4 px-0">
      {/* Room title row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-white tracking-tight truncate">
            # Room {roomCode}
          </h2>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-medium tabular-nums text-white/45">
            <span>Offset {offsetMs >= 0 ? '+' : ''}{offsetMs.toFixed(0)}ms</span>
            <span>RTT {rttMs > 0 ? `${rttMs.toFixed(0)}ms` : '—'}</span>
            <span>OL {rttMs > 0 ? `${olMs.toFixed(0)}ms` : '—'}</span>
            <span>NTP {Number.isFinite(offsetMs) ? 'on' : '—'}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onQrClick}
          className="shrink-0 flex flex-col items-center gap-0.5 text-[10px] font-semibold text-white/55 active:text-white"
          aria-label="Show QR code"
        >
          <span className="uppercase tracking-wide">QR</span>
          <QrCode size={20} strokeWidth={2} className="text-white/80" />
        </button>
      </div>

      {/* Playback permissions */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2">
          Playback permissions
        </p>
        <div
          className="flex rounded-xl p-0.5 gap-0.5 border border-white/10 bg-[#0d0d0d]"
          role="group"
          aria-label="Who can control playback"
        >
          <button
            type="button"
            disabled={!isHost}
            onClick={() => onPlaybackPermissionsChange?.('everyone')}
            className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 rounded-[11px] text-[11px] font-semibold transition-all disabled:opacity-60 ${
              permEveryone ? 'text-white' : 'text-white/45'
            }`}
            style={permEveryone ? {
              background: `color-mix(in srgb, ${GREEN} 22%, transparent)`,
              color: GREEN,
            } : {}}
          >
            <Users size={14} strokeWidth={2} />
            Everyone
          </button>
          <button
            type="button"
            disabled={!isHost}
            onClick={() => onPlaybackPermissionsChange?.('admins')}
            className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 rounded-[11px] text-[11px] font-semibold transition-all disabled:opacity-60 ${
              !permEveryone ? 'text-white' : 'text-white/45'
            }`}
            style={!permEveryone ? {
              background: `color-mix(in srgb, ${GREEN} 22%, transparent)`,
              color: GREEN,
            } : {}}
          >
            <Crown size={14} strokeWidth={2} />
            Admins
          </button>
        </div>
      </section>

      {/* Global volume (host) */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2">
          Global volume
        </p>
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0d0d0d] px-3 py-3">
          <Volume2 size={18} className="text-white/55 shrink-0" strokeWidth={2} />
          <div className="flex-1 relative h-1 rounded-full min-w-0 bg-white/15">
            <div
              className="absolute h-full rounded-full pointer-events-none bg-white"
              style={{ width: `${Math.round(globalVolume * 100)}%` }}
            />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={globalVolume}
              onChange={(e) => onGlobalVolumeChange?.(Number(e.target.value))}
              disabled={!isHost}
              aria-label="Global room volume"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
            />
          </div>
          <span className="text-[11px] font-semibold tabular-nums text-white/80 w-10 text-right shrink-0">
            {Math.round(globalVolume * 100)}%
          </span>
        </div>
      </section>

      {/* Timing nudge */}
      <section>
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Timing nudge
          </p>
          <span className="text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md bg-white/10 text-white/45">
            50ms step
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0d0d0d] p-2">
          <button
            type="button"
            onClick={() => onListeningNudgeDelta?.(-50)}
            className="shrink-0 w-11 h-11 rounded-lg border border-white/12 text-white/80 text-lg font-semibold active:bg-white/10"
            aria-label="Decrease timing nudge"
          >
            −
          </button>
          <div className="flex-1 text-center">
            <span className="text-sm font-bold tabular-nums text-white">
              {listeningNudgeMs >= 0 ? '+' : ''}{listeningNudgeMs}ms
            </span>
          </div>
          <button
            type="button"
            onClick={() => onListeningNudgeDelta?.(50)}
            className="shrink-0 w-11 h-11 rounded-lg border border-white/12 text-white/80 text-lg font-semibold active:bg-white/10"
            aria-label="Increase timing nudge"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={onMetronomeTap}
          className={`mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[11px] font-semibold transition-colors ${
            metronomePulse ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-[#0d0d0d] text-white/55'
          }`}
        >
          <Timer size={15} strokeWidth={2} />
          Metronome pulse
        </button>
      </section>

      <ParticipantList
        participants={participants}
        myId={myId}
        variant="session"
        headerIcon={Send}
      />

      <div className="rounded-xl border border-white/10 bg-[#0d0d0d] p-3">
        <p className="text-[11px] font-bold text-white mb-1.5">Tips</p>
        <ul className="text-[11px] text-white/55 leading-relaxed list-disc pl-4 space-y-1">
          <li>Play on speaker directly. Don&apos;t use Bluetooth for tighter sync.</li>
        </ul>
      </div>

      {showUpload && (
        <button
          type="button"
          onClick={onUploadClick}
          className="w-full min-h-[56px] rounded-2xl border flex items-stretch overflow-hidden active:opacity-95 transition-opacity"
          style={{ borderColor: `color-mix(in srgb, ${GREEN} 40%, transparent)` }}
        >
          <span
            className="w-14 shrink-0 flex items-center justify-center"
            style={{ background: GREEN }}
          >
            <Plus size={26} strokeWidth={2.5} className="text-black" />
          </span>
          <span className="flex flex-col items-start justify-center px-4 py-3 text-left bg-black">
            <span className="text-sm font-bold text-white">Upload audio</span>
            <span className="text-[11px] text-white/45 mt-0.5">Add music to queue</span>
          </span>
        </button>
      )}

      <button
        type="button"
        onClick={onLeave}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-semibold transition-colors border border-white/10 bg-[#111] text-white/50"
      >
        Leave room
      </button>
    </div>
  );
}
