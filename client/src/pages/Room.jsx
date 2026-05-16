import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy, LogOut, Wifi, WifiOff, Map, MessageSquare,
  Users, Check,
  Code2, Music2, Sparkles,
} from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useRoom } from '../context/RoomContext';
import { useSocket } from '../hooks/useSocket';
import {
  getBackendHint,
  incompatibleRealtimeBuildMessage,
  isDeployedSiteMissingServerUrl,
  isIncompatibleRealtimeHostForBuild,
} from '../utils/siteUrl';
import { useAudioSync } from '../hooks/useAudioSync';
import { NTPSync } from '../utils/ntpSync';
import AudioPlayer from '../components/AudioPlayer';
import Playlist from '../components/Playlist';
import Chat from '../components/Chat';
import SpatialMap from '../components/SpatialMap';
import ShareModal from '../components/ShareModal';
import BrandLogo from '../components/BrandLogo';
import MobileSessionPanel from '../components/MobileSessionPanel';

const MOBILE_NAV = [
  { id: 'session', label: 'Session', icon: Users },
  { id: 'music', label: 'Music', icon: Music2 },
  { id: 'fun', label: 'Fun', icon: Sparkles },
];

const SPATIAL_STORAGE_KEY = 'syncmusic-spatial-enabled';

const NUDGE_STORAGE_PREFIX = 'syncmusic-nudge-';

function readSpatialPreference() {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(SPATIAL_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export default function Room() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { room, setRoom, userName } = useRoom();
  const { socket, connected, lastConnectError } = useSocket();
  const [ntpOffset, setNtpOffset] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [spatialPositions, setSpatialPositions] = useState({});
  const [mobileTab, setMobileTab] = useState('session');
  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(true);
  const [joinError, setJoinError] = useState('');
  const [showShare, setShowShare] = useState(false);
  const [addFormNonce, setAddFormNonce] = useState(0);
  const ntpRef = useRef(null);
  const joinSessionRef = useRef('');
  const queuePanelRef = useRef(null);
  const [spatialEnabled, setSpatialEnabled] = useState(readSpatialPreference);
  const [syncRtt, setSyncRtt] = useState(0);
  const [rightTab, setRightTab] = useState('chat');
  const isLg = useMediaQuery('(min-width: 1024px)');
  const [listeningNudgeMs, setListeningNudgeMs] = useState(0);
  const [metronomePulse, setMetronomePulse] = useState(false);

  useEffect(() => {
    const rc = room?.code;
    if (!rc) return;
    try {
      const raw = localStorage.getItem(`${NUDGE_STORAGE_PREFIX}${rc}`);
      if (raw == null) {
        setListeningNudgeMs(0);
        return;
      }
      const n = parseInt(raw, 10);
      setListeningNudgeMs(Number.isFinite(n) ? Math.max(-5000, Math.min(5000, n)) : 0);
    } catch {
      setListeningNudgeMs(0);
    }
  }, [room?.code]);

  const persistListeningNudge = useCallback((n) => {
    const rc = room?.code;
    if (!rc) return;
    try {
      localStorage.setItem(`${NUDGE_STORAGE_PREFIX}${rc}`, String(n));
    } catch {
      /* ignore */
    }
  }, [room?.code]);

  const openQueueAndAddTrack = useCallback(() => {
    setMobileTab('music');
    setAddFormNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SPATIAL_STORAGE_KEY, spatialEnabled ? '1' : 'false');
    } catch {
      /* ignore */
    }
  }, [spatialEnabled]);

  const onSpatialPositionChange = useCallback((pos) => {
    if (!spatialEnabled || !socket || !room?.code) return;
    socket.emit('spatial:update', { code: room.code, position: pos });
  }, [spatialEnabled, socket, room]);

  const myId = socket?.id;
  const mySpatialPos = myId && spatialPositions[myId] ? spatialPositions[myId] : null;

  const isHost = room?.hostId === myId;
  const everyonePlayback = room?.playbackPermissions !== 'admins';
  const canControlPlayback = everyonePlayback || isHost;

  const effectiveNtpOffset = ntpOffset + listeningNudgeMs;
  const gvRaw = Number(room?.globalVolume);
  const mixGlobalVolume = Number.isFinite(gvRaw) ? Math.max(0, Math.min(1, gvRaw)) : 1;

  const {
    isPlaying, currentTime, duration, volume, playBlocked,
    loadAudio, play, pause, seek, setVolume, unlockRemotePlayback,
  } = useAudioSync(socket, room?.code, effectiveNtpOffset, {
    enabled: spatialEnabled,
    position: mySpatialPos,
  }, { globalVolume: mixGlobalVolume });

  const currentTrack = room?.playlist?.[room?.playbackState?.trackIndex] || room?.currentTrack || null;

  useEffect(() => {
    if (!connected) {
      joinSessionRef.current = '';
    }
  }, [connected]);

  /* Stall guard: spinner forever when the Node server isn’t running or firewall blocks websocket */
  useEffect(() => {
    if (isDeployedSiteMissingServerUrl() || isIncompatibleRealtimeHostForBuild()) return;
    if (!socket || connected) return undefined;

    const id = window.setTimeout(() => {
      setJoining(false);
      setJoinError(() => {
        const hint = getBackendHint();
        if (lastConnectError) return `${lastConnectError} (${hint})`;
        return `Cannot reach realtime server (${hint}). Start the backend (often port 3001), check ALLOWED_ORIGINS / CORS, and confirm VITE_SERVER_URL at build time.`;
      });
    }, 14000);

    return () => clearTimeout(id);
  }, [socket, connected, lastConnectError]);

  /* ── NTP Sync + room join ───────────────────────── */
  useEffect(() => {
    if (!socket || !connected) return;
    const sessionKey = `${socket.id || 'unknown'}:${code || ''}`;
    if (joinSessionRef.current === sessionKey) return;
    joinSessionRef.current = sessionKey;

    const controller = new AbortController();
    let cancelled = false;
    let joinAckTimeoutId = null;

    const clearAckTimeout = () => {
      if (joinAckTimeoutId != null) {
        clearTimeout(joinAckTimeoutId);
        joinAckTimeoutId = null;
      }
    };

    joinAckTimeoutId = window.setTimeout(() => {
      if (cancelled) return;
      setJoinError('Joining timed out. Server did not acknowledge. Try reloading.');
      setJoining(false);
    }, 12000);

    const finishHandshake = () => {
      clearAckTimeout();
      if (!cancelled) setJoining(false);
    };

    setJoining(true);
    setJoinError('');

    const init = async () => {
      try {
        ntpRef.current = new NTPSync(socket);
        let offset = 0;
        try {
          offset = await ntpRef.current.sync({ signal: controller.signal });
        } catch {
          // Continue with join even if NTP probes fail.
        }
        if (cancelled) return;
        setNtpOffset(offset);
        setSyncRtt(ntpRef.current?.lastMedianRtt ?? 0);

        if (code === 'new') {
          socket.emit('room:create', { userName: userName || 'Host', isPublic: true }, (res) => {
            if (cancelled) return;
            if (res?.success) {
              setRoom(res.room);
              navigate(`/room/${res.room.code}`, { replace: true });
            } else {
              setJoinError('Failed to create room');
            }
            finishHandshake();
          });
          return;
        }

        socket.emit('room:join', { code, userName: userName || 'Listener' }, (res) => {
          if (cancelled) return;
          if (res?.success) {
            setRoom(res.room);
            setChatMessages(res.room.chat || []);
          } else {
            setJoinError(res?.error || 'Room not found');
          }
          finishHandshake();
        });
      } catch {
        if (cancelled) return;
        setJoinError('Unable to join room right now');
        finishHandshake();
      }
    };

    void init();

    return () => {
      cancelled = true;
      clearAckTimeout();
      controller.abort();
    };
  }, [socket, connected, code, userName, setRoom, navigate]);

  /* ── Socket event listeners ─────────────────────── */
  useEffect(() => {
    if (!socket) return;

    const handleParticipantJoined = ({ participants }) => {
      setRoom((r) => r ? { ...r, participants } : r);
    };

    const handleParticipantLeft = ({ participants, newHostId }) => {
      setRoom((r) => r ? { ...r, participants, hostId: newHostId } : r);
    };

    const handleTrackAdded = ({ playlist, currentTrack: nextTrack, trackIndex }) => {
      setRoom((r) => {
        if (!r) return r;
        const nextIndex = Number.isInteger(trackIndex) ? trackIndex : r.playbackState?.trackIndex;
        return {
          ...r,
          playlist,
          currentTrack: nextTrack,
          playbackState: { ...r.playbackState, trackIndex: nextIndex },
        };
      });
    };

    const handleTrackChanged = ({ trackIndex, currentTrack, serverTime }) => {
      setRoom((r) => {
        if (!r) return r;
        return {
          ...r,
          playbackState: {
            ...r.playbackState,
            trackIndex,
            isPlaying: true,
            currentTime: 0,
            startedAt: serverTime != null ? serverTime : Date.now(),
          },
          currentTrack,
        };
      });
    };

    const handlePlaybackSync = ({
      trackIndex,
      currentTrack: syncedTrack,
      isPlaying,
      currentTime,
      startedAt,
      serverTime,
    }) => {
      setRoom((r) => {
        if (!r) return r;
        const nextIndex = Number.isInteger(trackIndex) ? trackIndex : r.playbackState?.trackIndex;
        const nextPs = { ...r.playbackState, trackIndex: nextIndex };
        if (typeof isPlaying === 'boolean') nextPs.isPlaying = isPlaying;
        if (Number.isFinite(currentTime)) nextPs.currentTime = currentTime;
        if (typeof isPlaying === 'boolean' && !isPlaying) nextPs.startedAt = null;
        else if (startedAt != null && Number.isFinite(startedAt)) nextPs.startedAt = startedAt;
        else if (typeof isPlaying === 'boolean' && isPlaying && serverTime != null) nextPs.startedAt = serverTime;
        return {
          ...r,
          currentTrack: syncedTrack != null ? syncedTrack : r.currentTrack,
          playbackState: nextPs,
        };
      });
    };

    const handleChatMessage = (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    };

    const handleSpatialPositions = ({ userId, position }) => {
      setSpatialPositions((prev) => ({ ...prev, [userId]: position }));
    };

    const handleRoomVisibility = ({ isPublic }) => {
      setRoom((r) => (r ? { ...r, isPublic: !!isPublic } : r));
    };

    const handleRoomSettings = (payload) => {
      setRoom((r) => {
        if (!r) return r;
        const next = { ...r };
        if (payload.playbackPermissions != null) {
          next.playbackPermissions = payload.playbackPermissions;
        }
        if (payload.globalVolume != null) {
          next.globalVolume = payload.globalVolume;
        }
        return next;
      });
    };

    socket.on('room:participant_joined', handleParticipantJoined);
    socket.on('room:participant_left', handleParticipantLeft);
    socket.on('track:added', handleTrackAdded);
    socket.on('playback:track_changed', handleTrackChanged);
    socket.on('playback:sync', handlePlaybackSync);
    socket.on('chat:message', handleChatMessage);
    socket.on('spatial:positions', handleSpatialPositions);
    socket.on('room:visibility', handleRoomVisibility);
    socket.on('room:settings', handleRoomSettings);

    return () => {
      socket.off('room:participant_joined', handleParticipantJoined);
      socket.off('room:participant_left', handleParticipantLeft);
      socket.off('track:added', handleTrackAdded);
      socket.off('playback:track_changed', handleTrackChanged);
      socket.off('playback:sync', handlePlaybackSync);
      socket.off('chat:message', handleChatMessage);
      socket.off('spatial:positions', handleSpatialPositions);
      socket.off('room:visibility', handleRoomVisibility);
      socket.off('room:settings', handleRoomSettings);
    };
  }, [socket, setRoom]);

  useEffect(() => {
    if (currentTrack?.url) loadAudio(currentTrack.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.url]);

  const configBlock =
    (isDeployedSiteMissingServerUrl()
      ? (
        'This site was built without VITE_SERVER_URL, so realtime sync targets localhost — which only works on the developer PC. '
        + `Set VITE_SERVER_URL to your hosted Socket.IO server (current build target was ${getBackendHint()}).`
      )
      : '')
    || incompatibleRealtimeBuildMessage();

  /* ── Action handlers ────────────────────────────── */
  const handlePlay = useCallback(() => {
    if (!canControlPlayback || !room?.code) return;
    const serverTime = (ntpRef.current?.serverNow() || Date.now()) + 300;
    socket.emit('playback:play', { code: room.code, serverTime, currentTime, trackIndex: room.playbackState.trackIndex });
    play(serverTime);
  }, [canControlPlayback, socket, room, currentTime, play]);

  const handlePause = useCallback(() => {
    if (!canControlPlayback || !room?.code) return;
    socket.emit('playback:pause', { code: room.code, currentTime });
    pause();
  }, [canControlPlayback, socket, room, currentTime, pause]);

  const handleSeek = useCallback((t) => {
    if (!canControlPlayback || !room?.code) return;
    socket.emit('playback:seek', { code: room.code, currentTime: t });
    seek(t);
  }, [canControlPlayback, socket, room, seek]);

  const handleNext = useCallback(() => {
    if (!canControlPlayback) return;
    socket.emit('playback:next', { code: room?.code });
  }, [canControlPlayback, socket, room]);

  const handlePrev = useCallback(() => {
    if (!canControlPlayback) return;
    socket.emit('playback:prev', { code: room?.code });
  }, [canControlPlayback, socket, room]);

  const handleAddTrack = useCallback((track) => {
    socket.emit('track:add', { code: room?.code, track }, (res) => {
      if (!res?.success) setJoinError('Failed to add track');
    });
  }, [socket, room]);

  const handleRemoveTrack = useCallback((index) => {
    if (!socket || !room?.code || !isHost) return;
    socket.emit('track:remove', { code: room.code, index }, (res) => {
      if (!res?.success) setJoinError(res?.error || 'Could not remove track');
    });
  }, [socket, room?.code, isHost]);

  const handleSelectTrack = useCallback((index) => {
    const track = room?.playlist?.[index];
    if (!canControlPlayback || !track || !room?.code) return;
    setRoom((r) => r ? { ...r, playbackState: { ...r.playbackState, trackIndex: index }, currentTrack: track } : r);
    const serverTime = (ntpRef.current?.serverNow() || Date.now()) + 300;
    socket.emit('playback:play', { code: room.code, serverTime, currentTime: 0, trackIndex: index });
    play(serverTime);
  }, [canControlPlayback, socket, room, play, setRoom]);

  const handleChat = useCallback((message) => {
    socket.emit('chat:send', { code: room?.code, message, userName: userName || 'User' });
  }, [socket, room, userName]);

  const handleLeave = () => {
    socket.emit('room:leave', { code: room?.code });
    setRoom(null);
    navigate('/');
  };

  const copyCode = async () => {
    const text = room?.code || '';
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy room code:', text);
    }
  };

  const setPlaybackPermissionsMode = useCallback((mode) => {
    if (!socket || !room?.code || !isHost) return;
    socket.emit('room:set_playback_permissions', { code: room.code, playbackPermissions: mode }, () => {});
  }, [socket, room?.code, isHost]);

  const setGlobalRoomVolume = useCallback((v) => {
    if (!socket || !room?.code || !isHost) return;
    socket.emit('room:set_global_volume', { code: room.code, globalVolume: Math.max(0, Math.min(1, v)) }, () => {});
  }, [socket, room?.code, isHost]);

  const bumpListeningNudge = useCallback((delta) => {
    setListeningNudgeMs((prev) => {
      const next = Math.max(-5000, Math.min(5000, prev + delta));
      persistListeningNudge(next);
      return next;
    });
  }, [persistListeningNudge]);

  /* ── Loading state ──────────────────────────────── */
  if (configBlock) {
    return (
      <div className="page-ambient min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
        <div className="bg-mesh absolute inset-0 opacity-35 pointer-events-none" aria-hidden />
        <div className="orb orb-pink w-[380px] h-[380px] opacity-[0.28]" />

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="relative surface-3d rounded-2xl p-8 max-w-md w-full text-center space-y-5 card-glow z-[1]"
          style={{ borderColor: 'color-mix(in srgb, #EF4444 25%, transparent)' }}
        >
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mx-auto">
            <WifiOff size={22} className="text-red-400" />
          </div>
          <div>
            <p className="text-[var(--text)] font-bold text-base">{configBlock}</p>
          </div>
          <button type="button" onClick={() => navigate('/')} className="btn-primary w-full py-3 rounded-xl text-sm font-semibold">
            Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  if (joining) {
    return (
      <div className="page-ambient min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="bg-mesh absolute inset-0 opacity-40 pointer-events-none" aria-hidden />
        <div className="orb orb-purple w-[min(100vw,440px)] h-[min(100vw,440px)] animate-orb-1 opacity-[0.35]" />
        <div className="orb orb-cyan w-[360px] h-[360px] animate-orb-2 right-0 bottom-0 opacity-[0.28]" />

        <div className="relative text-center space-y-6 z-[1]">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-[var(--primary)]/15" />
            <div className="absolute inset-0 rounded-full border-2 border-t-[var(--primary)] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            <div className="absolute inset-3 rounded-full flex items-center justify-center overflow-hidden">
              <BrandLogo size={40} className="rounded-full" />
            </div>
          </div>
          <div>
            <p className="text-[var(--text)] font-bold text-base">Joining room…</p>
            <p className="text-[var(--muted)] text-xs mt-1.5 flex items-center justify-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-[var(--primary)] animate-pulse" />
              Synchronizing clocks
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Error state ────────────────────────────────── */
  if (joinError) {
    return (
      <div className="page-ambient min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
        <div className="bg-mesh absolute inset-0 opacity-35 pointer-events-none" aria-hidden />
        <div className="orb orb-pink w-[380px] h-[380px] opacity-[0.28]" />

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="relative surface-3d rounded-2xl p-8 max-w-sm w-full text-center space-y-5 card-glow z-[1]"
          style={{ borderColor: 'color-mix(in srgb, #EF4444 25%, transparent)' }}
        >
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mx-auto">
            <WifiOff size={22} className="text-red-400" />
          </div>
          <div>
            <p className="text-[var(--text)] font-bold text-base">{joinError}</p>
            <p className="text-[var(--muted)] text-sm mt-1.5">
              {/Cannot reach realtime|Joining timed out|XHR|websocket/i.test(joinError || '')
                ? 'Check that the sync server is running, reachable from this network, and that your deployment built with the correct `VITE_SERVER_URL`. Then try again.'
                : 'This room may not exist or has already ended.'}
            </p>
          </div>
          <button type="button" onClick={() => navigate('/')} className="btn-primary w-full py-3 rounded-xl text-sm font-semibold">
            Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  /* ── Main render ────────────────────────────────── */
  return (
    <div className="page-ambient page-studio h-[100dvh] min-h-[100dvh] max-h-[100dvh] flex flex-col relative overflow-hidden overflow-x-hidden max-w-[100vw] overscroll-none bg-[var(--bg)]">
      <header className="sticky top-0 z-[70] shrink-0 border-b border-[color-mix(in_srgb,var(--border)_55%,transparent)] bg-black lg:bg-[var(--bg)]">
        {/* Mobile studio header */}
        <div className="lg:hidden px-3 pt-[calc(0.4rem+env(safe-area-inset-top,0px))] pb-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <BrandLogo size={22} className="shrink-0 rounded-lg" />
              <span className="text-[14px] font-bold text-white tracking-tight shrink-0">Beatsync</span>
              <button
                type="button"
                onClick={copyCode}
                className="flex items-center gap-1 font-mono-ui text-[11px] text-[var(--muted)] shrink-0 px-1.5 py-0.5 rounded-md active:bg-white/5"
              >
                # {room?.code}
                {copied ? <Check size={10} className="text-emerald-400" /> : null}
              </button>
              <div className="flex items-center gap-1 text-[11px] text-[var(--muted)] shrink-0 min-w-0">
                <Users size={12} className="shrink-0 opacity-80" />
                <span className="tabular-nums whitespace-nowrap">
                  {room?.participants?.length ?? 0} {(room?.participants?.length ?? 0) === 1 ? 'user' : 'users'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href="https://discord.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 w-8 flex items-center justify-center rounded-lg border text-[var(--muted)] active:bg-white/5"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                aria-label="Discord"
              >
                <span className="text-[10px] font-bold">D</span>
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 w-8 flex items-center justify-center rounded-lg border text-[var(--muted)] active:bg-white/5"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                aria-label="GitHub"
              >
                <Code2 size={14} strokeWidth={2} />
              </a>
            </div>
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-2 min-h-11 px-2 sm:px-4 pt-[calc(0.35rem+env(safe-area-inset-top,0px))] pb-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
            <BrandLogo size={26} className="flex-shrink-0 rounded-lg" />
            <span className="text-[13px] font-bold tracking-tight text-[var(--text)] hidden sm:inline">Beatsync</span>
            <div
              className={`flex items-center gap-1 text-[10px] font-mono-ui px-2 py-1 rounded-md shrink-0 border ${
                connected ? 'text-emerald-400 border-emerald-500/25' : 'text-red-400 border-red-500/25'
              }`}
              style={{ background: 'var(--surface)' }}
            >
              {connected ? <Wifi size={10} strokeWidth={2.5} /> : <WifiOff size={10} strokeWidth={2.5} />}
              <span className="tabular-nums">{room?.participants?.length ?? 0} online</span>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="hidden sm:flex items-center gap-1 font-mono-ui text-[11px] font-semibold px-2 py-1 rounded-md border shrink-0 max-w-[9rem]"
              style={{
                color: 'var(--muted)',
                borderColor: 'var(--border)',
                background: 'var(--surface)',
              }}
            >
              <span className="truncate">#{room?.code}</span>
              {copied ? <Check size={10} className="text-emerald-400 shrink-0" /> : <Copy size={10} className="opacity-50 shrink-0" />}
            </button>
          </div>

          <div className="hidden md:flex flex-col items-center justify-center text-center pointer-events-none min-w-0 px-2">
            <div className="font-mono-ui text-[10px] text-[var(--muted)] tabular-nums leading-tight flex flex-wrap justify-center gap-x-3 gap-y-0.5">
              <span>Offset {ntpOffset >= 0 ? '+' : ''}{ntpOffset.toFixed(2)}ms</span>
              <span>RTT {syncRtt > 0 ? `${syncRtt.toFixed(2)}ms` : '—'}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <a
              href="https://discord.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg border text-[var(--muted)] hover:text-[var(--text)] transition-colors text-[10px] font-bold"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              aria-label="Discord"
            >
              D
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg border text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              aria-label="GitHub"
            >
              <Code2 size={15} strokeWidth={2} />
            </a>
            <button
              type="button"
              onClick={handleLeave}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors border"
              style={{ color: 'var(--muted)', borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
              <LogOut size={12} strokeWidth={2.5} />
              <span className="hidden sm:inline">Leave</span>
            </button>
          </div>
        </div>
      </header>

      <div className="room-shell flex-1 flex flex-col min-h-0">
        <div className="room-grid relative z-10 flex-1 min-h-0 w-full">

        {/* ── CENTER: queue (desktop) · player + tabs (mobile) ── */}
        <div className="room-col room-grid-center-slot flex flex-col flex-1 min-h-0 w-full lg:h-full overflow-hidden relative bg-black lg:bg-[var(--bg)]">
          {isLg ? (
            <>
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-4 pt-4 pb-6 w-full max-w-full">
                <Playlist
                  ref={queuePanelRef}
                  playlist={room?.playlist || []}
                  currentTrackIndex={room?.playbackState?.trackIndex ?? -1}
                  isHost={isHost}
                  canControlPlayback={canControlPlayback}
                  onAddTrack={handleAddTrack}
                  onSelectTrack={handleSelectTrack}
                  addFormNonce={addFormNonce}
                />
              </div>
              <AudioPlayer
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                volume={volume}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeek={handleSeek}
                onVolume={setVolume}
                onNext={handleNext}
                onPrev={handlePrev}
                isHost={isHost}
                canControlPlayback={canControlPlayback}
                needsTapToPlay={playBlocked}
                onTapToPlay={unlockRemotePlayback}
                onOpenAddTracks={openQueueAndAddTrack}
              />
            </>
          ) : (
            <>
              <div className="flex flex-col flex-1 min-h-0 w-full overflow-hidden bg-black">
                <nav
                  className="shrink-0 flex border-b border-[color-mix(in_srgb,var(--border)_55%,transparent)] bg-black px-1 pt-1"
                  role="tablist"
                  aria-label="Room sections"
                >
                  {MOBILE_NAV.map(({ id, label, icon: TabIcon }) => {
                    const active = mobileTab === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setMobileTab(id)}
                        className={`relative flex-1 flex flex-col items-center gap-1 py-2.5 rounded-t-lg transition-colors ${
                          active ? 'bg-[#161616] text-white' : 'text-[var(--muted)] active:bg-white/5'
                        }`}
                      >
                        {active ? (
                          <span className="absolute top-0 left-3 right-3 h-0.5 bg-white rounded-full pointer-events-none" aria-hidden />
                        ) : null}
                        <TabIcon size={16} strokeWidth={active ? 2 : 1.75} className={active ? 'text-white' : 'opacity-70'} />
                        <span className="text-[10px] font-semibold tracking-tight">{label}</span>
                      </button>
                    );
                  })}
                </nav>

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pt-3 pb-[10.5rem]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={mobileTab}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.12 }}
                      className="min-h-0"
                    >
                      {mobileTab === 'session' && (
                        <MobileSessionPanel
                          roomCode={room?.code || ''}
                          onQrClick={() => setShowShare(true)}
                          offsetMs={ntpOffset}
                          rttMs={syncRtt}
                          playbackPermissions={room?.playbackPermissions === 'admins' ? 'admins' : 'everyone'}
                          onPlaybackPermissionsChange={setPlaybackPermissionsMode}
                          globalVolume={mixGlobalVolume}
                          onGlobalVolumeChange={setGlobalRoomVolume}
                          listeningNudgeMs={listeningNudgeMs}
                          onListeningNudgeDelta={bumpListeningNudge}
                          metronomePulse={metronomePulse}
                          onMetronomeTap={() => setMetronomePulse((p) => !p)}
                          participants={room?.participants || []}
                          myId={myId}
                          onUploadClick={openQueueAndAddTrack}
                          showUpload={isHost}
                          onLeave={handleLeave}
                          isHost={isHost}
                        />
                      )}

                      {mobileTab === 'music' && (
                        <Playlist
                          ref={queuePanelRef}
                          variant="mobile"
                          playlist={room?.playlist || []}
                          currentTrackIndex={room?.playbackState?.trackIndex ?? -1}
                          isHost={isHost}
                          canControlPlayback={canControlPlayback}
                          onAddTrack={handleAddTrack}
                          onSelectTrack={handleSelectTrack}
                          addFormNonce={addFormNonce}
                          playingDuration={duration}
                          onRemoveTrack={handleRemoveTrack}
                        />
                      )}

                      {mobileTab === 'fun' && (
                        <div className="flex flex-col gap-6 pb-4">
                          <div
                            className="rounded-xl border overflow-hidden flex flex-col h-[min(42vh,22rem)] min-h-[220px]"
                            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                          >
                            <div className="flex-1 min-h-0 flex flex-col p-3 overflow-hidden">
                              <Chat messages={chatMessages} onSend={handleChat} myId={myId} />
                            </div>
                          </div>
                          <div className="flex flex-col gap-3 shrink-0">
                            <div className="flex items-center justify-between gap-2 min-w-0">
                              <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--faint)' }}>
                                <Map size={11} />
                                Spatial Audio
                              </h3>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-[10px] font-bold tabular-nums ${spatialEnabled ? 'text-emerald-400' : 'text-[var(--faint)]'}`}>{spatialEnabled ? 'On' : 'Off'}</span>
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={spatialEnabled}
                                  aria-label={spatialEnabled ? 'Turn spatial positioning off' : 'Turn spatial positioning on'}
                                  onClick={() => setSpatialEnabled((v) => !v)}
                                  className="rounded-lg px-2 py-1 text-[10px] font-bold border transition-colors whitespace-nowrap"
                                  style={{
                                    borderColor: spatialEnabled ? 'color-mix(in srgb, var(--primary) 35%, transparent)' : 'var(--border)',
                                    color: spatialEnabled ? 'var(--primary)' : 'var(--muted)',
                                    background: spatialEnabled ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'var(--surface)',
                                  }}
                                >
                                  {spatialEnabled ? 'Turn off' : 'Turn on'}
                                </button>
                              </div>
                            </div>
                            <div className="flex-1 min-h-[11rem] rounded-xl border overflow-hidden surface-3d !rounded-xl p-0" style={{ borderColor: 'var(--border)' }}>
                              <SpatialMap
                                disabled={!spatialEnabled}
                                participants={room?.participants || []}
                                spatialPositions={spatialPositions}
                                myId={myId}
                                onPositionChange={onSpatialPositionChange}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
              <AudioPlayer
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                volume={volume}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeek={handleSeek}
                onVolume={setVolume}
                onNext={handleNext}
                onPrev={handlePrev}
                isHost={isHost}
                canControlPlayback={canControlPlayback}
                needsTapToPlay={playBlocked}
                onTapToPlay={unlockRemotePlayback}
                onOpenAddTracks={openQueueAndAddTrack}
              />
            </>
          )}
        </div>

        {/* ── RIGHT SIDEBAR (desktop) ── */}
        <aside
          className="room-col room-col-right hidden lg:flex lg:flex-col flex-1 min-h-0 lg:h-full border-t lg:border-t-0 z-[1] relative"
          style={{ background: 'var(--surface)' }}
        >
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden px-4 pt-4 pb-28">
            <div
              className="flex shrink-0 rounded-xl p-0.5 gap-0.5 mb-3 border"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
              role="tablist"
            >
              <button
                type="button"
                role="tab"
                aria-selected={rightTab === 'chat'}
                onClick={() => setRightTab('chat')}
                className={`flex flex-1 items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                  rightTab === 'chat' ? 'text-[var(--text)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
                style={rightTab === 'chat' ? { background: 'var(--surface)' } : {}}
              >
                <MessageSquare size={13} />
                Chat
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={rightTab === 'spatial'}
                onClick={() => setRightTab('spatial')}
                className={`flex flex-1 items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                  rightTab === 'spatial' ? 'text-[var(--text)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
                style={rightTab === 'spatial' ? { background: 'var(--surface)' } : {}}
              >
                <Map size={13} />
                Spatial
              </button>
            </div>

            <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
              {rightTab === 'chat' && (
                <Chat messages={chatMessages} onSend={handleChat} myId={myId} showTitle={false} />
              )}
              {rightTab === 'spatial' && (
                <div className="flex-1 flex flex-col min-h-0 gap-3 overflow-hidden">
                  <div className="flex items-center justify-between gap-2 shrink-0 min-w-0">
                    <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--faint)' }}>
                      <Map size={11} /> Spatial Audio
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold tabular-nums ${spatialEnabled ? 'text-emerald-400' : 'text-[var(--faint)]'}`}>{spatialEnabled ? 'On' : 'Off'}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={spatialEnabled}
                        aria-label={spatialEnabled ? 'Turn spatial positioning off' : 'Turn spatial positioning on'}
                        onClick={() => setSpatialEnabled((v) => !v)}
                        className="rounded-lg px-2 py-1 text-[10px] font-bold border transition-colors whitespace-nowrap"
                        style={{
                          borderColor: spatialEnabled ? 'color-mix(in srgb, var(--primary) 35%, transparent)' : 'var(--border)',
                          color: spatialEnabled ? 'var(--primary)' : 'var(--muted)',
                          background: spatialEnabled ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'var(--surface)',
                        }}
                      >
                        {spatialEnabled ? 'Turn off' : 'Turn on'}
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] shrink-0" style={{ color: 'var(--faint)' }}>Drag on the map to position yourself</p>
                  <div className="flex-1 min-h-[12rem] rounded-xl border overflow-hidden surface-3d !rounded-xl p-0" style={{ borderColor: 'var(--border)' }}>
                    <SpatialMap
                      disabled={!spatialEnabled}
                      participants={room?.participants || []}
                      spatialPositions={spatialPositions}
                      myId={myId}
                      onPositionChange={onSpatialPositionChange}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
      </div>

      {showShare && room?.code && (
        <ShareModal roomCode={room.code} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}
