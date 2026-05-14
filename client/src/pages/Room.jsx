import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy, LogOut, Wifi, WifiOff, Map, MessageSquare,
  ListMusic, Users, Check, QrCode, Headphones, Sparkles,
} from 'lucide-react';
import { useRoom } from '../context/RoomContext';
import { useSocket } from '../hooks/useSocket';
import { useAudioSync } from '../hooks/useAudioSync';
import { NTPSync } from '../utils/ntpSync';
import AudioPlayer from '../components/AudioPlayer';
import Playlist from '../components/Playlist';
import ParticipantList from '../components/ParticipantList';
import Chat from '../components/Chat';
import SpatialMap from '../components/SpatialMap';
import ShareModal from '../components/ShareModal';
import ThemeToggle from '../components/ThemeToggle';
import BrandLogo from '../components/BrandLogo';

const TABS = [
  { id: 'queue',   label: 'Queue',   icon: ListMusic },
  { id: 'people',  label: 'People',  icon: Users },
  { id: 'chat',    label: 'Chat',    icon: MessageSquare },
  { id: 'spatial', label: 'Spatial', icon: Map },
];

export default function Room() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { room, setRoom, userName } = useRoom();
  const { socket, connected } = useSocket();
  const [ntpOffset, setNtpOffset] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [spatialPositions, setSpatialPositions] = useState({});
  const [activeTab, setActiveTab] = useState('queue');
  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(true);
  const [joinError, setJoinError] = useState('');
  const [showShare, setShowShare] = useState(false);
  const [addFormNonce, setAddFormNonce] = useState(0);
  const ntpRef = useRef(null);
  const joinSessionRef = useRef('');

  const openQueueAndAddTrack = useCallback(() => {
    setActiveTab('queue');
    setAddFormNonce((n) => n + 1);
  }, []);

  const {
    isPlaying, currentTime, duration, volume, analyserData, playBlocked,
    loadAudio, play, pause, seek, setVolume, unlockRemotePlayback,
  } = useAudioSync(socket, room?.code, ntpOffset);

  const myId = socket?.id;
  const isHost = room?.hostId === myId;
  const currentTrack = room?.playlist?.[room?.playbackState?.trackIndex] || room?.currentTrack || null;

  useEffect(() => {
    if (!connected) {
      joinSessionRef.current = '';
    }
  }, [connected]);

  /* ── NTP Sync + room join ───────────────────────── */
  useEffect(() => {
    if (!socket || !connected) return;
    const sessionKey = `${socket.id || 'unknown'}:${code || ''}`;
    if (joinSessionRef.current === sessionKey) return;
    joinSessionRef.current = sessionKey;

    const controller = new AbortController();
    let cancelled = false;
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

        if (code === 'new') {
          socket.emit('room:create', { userName: userName || 'Host' }, (res) => {
            if (cancelled) return;
            if (res?.success) {
              setRoom(res.room);
              navigate(`/room/${res.room.code}`, { replace: true });
            } else {
              setJoinError('Failed to create room');
            }
            setJoining(false);
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
          setJoining(false);
        });
      } catch {
        if (cancelled) return;
        setJoinError('Unable to join room right now');
        setJoining(false);
      }
    };

    const joinTimeout = setTimeout(() => {
      if (cancelled) return;
      setJoinError('Joining timed out. Please try again.');
      setJoining(false);
    }, 10000);

    init().finally(() => {
      clearTimeout(joinTimeout);
    });

    return () => {
      cancelled = true;
      clearTimeout(joinTimeout);
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

    socket.on('room:participant_joined', handleParticipantJoined);
    socket.on('room:participant_left', handleParticipantLeft);
    socket.on('track:added', handleTrackAdded);
    socket.on('playback:track_changed', handleTrackChanged);
    socket.on('playback:sync', handlePlaybackSync);
    socket.on('chat:message', handleChatMessage);
    socket.on('spatial:positions', handleSpatialPositions);

    return () => {
      socket.off('room:participant_joined', handleParticipantJoined);
      socket.off('room:participant_left', handleParticipantLeft);
      socket.off('track:added', handleTrackAdded);
      socket.off('playback:track_changed', handleTrackChanged);
      socket.off('playback:sync', handlePlaybackSync);
      socket.off('chat:message', handleChatMessage);
      socket.off('spatial:positions', handleSpatialPositions);
    };
  }, [socket, setRoom]);

  useEffect(() => {
    if (currentTrack?.url) loadAudio(currentTrack.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.url]);

  /* ── Action handlers ────────────────────────────── */
  const handlePlay = useCallback(() => {
    if (!room?.code) return;
    const serverTime = (ntpRef.current?.serverNow() || Date.now()) + 300;
    socket.emit('playback:play', { code: room.code, serverTime, currentTime, trackIndex: room.playbackState.trackIndex });
    play(serverTime);
  }, [socket, room, currentTime, play]);

  const handlePause = useCallback(() => {
    if (!room?.code) return;
    socket.emit('playback:pause', { code: room.code, currentTime });
    pause();
  }, [socket, room, currentTime, pause]);

  const handleSeek = useCallback((t) => {
    if (!room?.code) return;
    socket.emit('playback:seek', { code: room.code, currentTime: t });
    seek(t);
  }, [socket, room, seek]);

  const handleNext = useCallback(() => socket.emit('playback:next', { code: room?.code }), [socket, room]);
  const handlePrev = useCallback(() => socket.emit('playback:prev', { code: room?.code }), [socket, room]);

  const handleAddTrack = useCallback((track) => {
    socket.emit('track:add', { code: room?.code, track }, (res) => {
      if (!res?.success) setJoinError('Failed to add track');
    });
  }, [socket, room]);

  const handleSelectTrack = useCallback((index) => {
    const track = room?.playlist?.[index];
    if (!track || !room?.code) return;
    setRoom((r) => r ? { ...r, playbackState: { ...r.playbackState, trackIndex: index }, currentTrack: track } : r);
    const serverTime = (ntpRef.current?.serverNow() || Date.now()) + 300;
    socket.emit('playback:play', { code: room.code, serverTime, currentTime: 0, trackIndex: index });
    play(serverTime);
  }, [socket, room, play, setRoom]);

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

  /* ── Loading state ──────────────────────────────── */
  if (joining) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center relative overflow-hidden">
        <div className="orb orb-purple w-[500px] h-[500px] animate-orb-1" />
        <div className="orb orb-cyan   w-[400px] h-[400px] animate-orb-2 right-0 bottom-0" />

        <div className="relative text-center space-y-6">
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
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4 relative overflow-hidden">
        <div className="orb orb-pink w-[400px] h-[400px] opacity-40" />

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="relative glass-lighter rounded-2xl p-8 max-w-sm w-full text-center space-y-5 border card-glow"
          style={{ borderColor: 'color-mix(in srgb, #EF4444 25%, transparent)' }}
        >
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mx-auto">
            <WifiOff size={22} className="text-red-400" />
          </div>
          <div>
            <p className="text-[var(--text)] font-bold text-base">{joinError}</p>
            <p className="text-[var(--muted)] text-sm mt-1.5">This room may not exist or has already ended.</p>
          </div>
          <button onClick={() => navigate('/')} className="btn-primary w-full py-3 rounded-xl text-sm font-semibold">
            Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  /* ── Main render ────────────────────────────────── */
  return (
    <div className="min-h-[100dvh] max-h-[100dvh] lg:min-h-screen lg:max-h-none bg-[var(--bg)] flex flex-col relative overflow-hidden overflow-x-hidden max-w-[100vw]">

      {/* Ambient background orbs */}
      <div className="orb orb-purple w-[700px] h-[700px] top-[-200px] left-[-150px] animate-orb-1 opacity-40 pointer-events-none" />
      <div className="orb orb-cyan w-[500px] h-[500px] bottom-[-100px] right-[-100px] animate-orb-2 opacity-30 pointer-events-none" />
      {isPlaying && (
        <div className="orb orb-pink w-[450px] h-[450px] top-[40%] left-[40%] animate-orb-1 opacity-25 pointer-events-none" style={{ animationDelay: '-4s' }} />
      )}

      {/* ═══ ROOM HEADER ═══ */}
      <header
        className="relative z-30 glass border-b px-3 sm:px-5 flex items-center justify-between sticky top-0 pt-[env(safe-area-inset-top,0px)] min-h-[calc(3.5rem+env(safe-area-inset-top,0px))]"
        style={{
          borderColor: 'color-mix(in srgb, var(--border) 70%, transparent)',
          boxShadow: '0 1px 30px rgba(0,0,0,0.15)',
        }}
      >
        {/* Left cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1 overflow-hidden">
          {/* Logo mark */}
          <BrandLogo size={28} className="flex-shrink-0" />

          {/* Room code pill */}
          <button
            onClick={copyCode}
            className="flex items-center gap-2 font-mono text-xs font-bold px-3 py-1.5 rounded-lg border transition-all"
            style={{
              color: 'var(--primary)',
              background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
              borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
            }}
          >
            {room?.code}
            {copied
              ? <Check size={11} className="text-emerald-400" />
              : <Copy size={11} className="opacity-60" />
            }
          </button>

          {/* Invite button */}
          <button
            onClick={() => setShowShare(true)}
            className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold"
          >
            <QrCode size={12} strokeWidth={2.5} />
            <span className="hidden sm:block">Invite</span>
          </button>

          {/* Sync status */}
          <div className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg ${
            connected ? 'text-emerald-400' : 'text-red-400'
          }`}
            style={{
              background: connected ? 'color-mix(in srgb, #10B981 8%, transparent)' : 'color-mix(in srgb, #EF4444 8%, transparent)',
              border: `1px solid color-mix(in srgb, ${connected ? '#10B981' : '#EF4444'} 25%, transparent)`,
            }}
          >
            {connected
              ? <><Wifi size={11} strokeWidth={2.5} /> Synced</>
              : <><WifiOff size={11} strokeWidth={2.5} /> Offline</>
            }
          </div>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          <div
            className="hidden sm:flex items-center gap-2 text-xs rounded-lg px-3 py-1.5"
            style={{ color: 'var(--muted)', background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <Users size={11} />
            {room?.participants?.length || 0}
          </div>
          <ThemeToggle size="sm" />
          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
            style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.borderColor = 'color-mix(in srgb, #EF4444 25%, transparent)'; e.currentTarget.style.background = 'color-mix(in srgb, #EF4444 8%, transparent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <LogOut size={12} strokeWidth={2.5} />
            <span className="hidden sm:block">Leave</span>
          </button>
        </div>
      </header>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">

        {/* ── LEFT SIDEBAR ── */}
        <aside
          className="lg:w-[300px] xl:w-[340px] flex flex-col border-r flex-1 min-h-0 min-w-0 basis-0 max-w-full overflow-x-hidden lg:flex-none lg:basis-auto lg:flex-shrink-0"
          style={{ borderColor: 'color-mix(in srgb, var(--border) 60%, transparent)', background: 'color-mix(in srgb, var(--bg) 80%, transparent)' }}
        >
          {/* Mobile tab bar */}
          <div
            className="flex lg:hidden border-b min-w-0 w-full overflow-x-hidden"
            style={{ borderColor: 'color-mix(in srgb, var(--border) 60%, transparent)', background: 'color-mix(in srgb, var(--surface) 40%, transparent)' }}
          >
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-label={tab.label}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative flex-1 min-w-0 max-w-[25%] py-2 px-0.5 flex flex-col items-center gap-0.5 text-[8px] sm:text-[10px] font-semibold transition-all leading-tight"
                  style={{ color: active ? 'var(--primary)' : 'var(--faint)' }}
                >
                  <tab.icon size={14} strokeWidth={1.8} className="shrink-0" />
                  <span className="w-full text-center truncate px-0.5">{tab.label}</span>
                  {active && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 sm:w-8 h-0.5 rounded-full max-w-[80%]"
                      style={{ background: 'var(--primary)' }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Desktop sidebar content */}
          <div className="hidden lg:flex flex-col flex-1 overflow-hidden p-4 gap-5">
            <div className="flex-shrink-0">
              <ParticipantList participants={room?.participants || []} myId={myId} />
            </div>
            <div className="flex-1 overflow-hidden">
              <Playlist
                playlist={room?.playlist || []}
                currentTrackIndex={room?.playbackState?.trackIndex ?? -1}
                isHost={isHost}
                onAddTrack={handleAddTrack}
                onSelectTrack={handleSelectTrack}
                addFormNonce={addFormNonce}
              />
            </div>
          </div>

          {/* Mobile sidebar content */}
          <div className="flex lg:hidden flex-1 overflow-hidden overflow-x-hidden min-h-0 min-w-0 w-full max-w-full px-2 py-2 sm:px-3 sm:py-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="w-full h-full flex flex-col min-h-0 min-w-0 max-w-full"
              >
                {activeTab === 'queue' && (
                  <Playlist
                    playlist={room?.playlist || []}
                    currentTrackIndex={room?.playbackState?.trackIndex ?? -1}
                    isHost={isHost}
                    onAddTrack={handleAddTrack}
                    onSelectTrack={handleSelectTrack}
                    addFormNonce={addFormNonce}
                  />
                )}
                {activeTab === 'people'  && <ParticipantList participants={room?.participants || []} myId={myId} />}
                {activeTab === 'chat'    && <Chat messages={chatMessages} onSend={handleChat} myId={myId} />}
                {activeTab === 'spatial' && (
                  <div className="flex-1 flex flex-col min-h-0">
                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--faint)' }}>Spatial Audio</h3>
                    <div className="flex-1 rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                      <SpatialMap
                        participants={room?.participants || []}
                        spatialPositions={spatialPositions}
                        myId={myId}
                        onPositionChange={(pos) => socket.emit('spatial:update', { code: room?.code, position: pos })}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </aside>

        {/* ── CENTER: Player ── */}
        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0">

          {/* Now Playing strip — desktop only */}
          <div className="hidden lg:flex absolute top-0 left-0 right-0 z-10 px-6 pt-4 pointer-events-none">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider"
                style={{
                  background: 'color-mix(in srgb, var(--primary) 8%, transparent)',
                  color: 'var(--primary)',
                  border: '1px solid color-mix(in srgb, var(--primary) 20%, transparent)',
                }}
              >
                {isPlaying
                  ? <><span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" /> Now Playing</>
                  : currentTrack
                    ? <><span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--faint)' }} /> Paused</>
                    : <><Sparkles size={10} /> Idle</>
                }
              </div>
              {currentTrack && (
                <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                  <Headphones size={11} />
                  {room?.participants?.length || 0} listening together
                </div>
              )}
            </div>
          </div>

          {/* Player area */}
          <div className="flex-1 px-3 py-5 sm:px-6 sm:py-8 flex flex-col justify-center items-center min-h-0 min-w-0 max-w-full overflow-x-hidden overflow-y-auto pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-8">
            <AudioPlayer
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              volume={volume}
              analyserData={analyserData}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeek={handleSeek}
              onVolume={setVolume}
              onNext={handleNext}
              onPrev={handlePrev}
              isHost={isHost}
              needsTapToPlay={playBlocked}
              onTapToPlay={unlockRemotePlayback}
              onOpenAddTracks={isHost ? openQueueAndAddTrack : undefined}
            />
          </div>

          {/* ── RIGHT SIDEBAR (desktop) ── */}
          <aside
            className="hidden lg:flex flex-col w-[300px] xl:w-[340px] border-l flex-shrink-0"
            style={{ borderColor: 'color-mix(in srgb, var(--border) 60%, transparent)', background: 'color-mix(in srgb, var(--bg) 80%, transparent)' }}
          >
            <div className="flex-1 overflow-hidden p-4 flex flex-col min-h-0">
              <Chat messages={chatMessages} onSend={handleChat} myId={myId} />
            </div>
            <div className="border-t p-4 flex-shrink-0" style={{ borderColor: 'color-mix(in srgb, var(--border) 60%, transparent)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--faint)' }}>
                  <Map size={11} /> Spatial Audio
                </h3>
                <span className="text-[10px]" style={{ color: 'var(--faint)' }}>Drag to position</span>
              </div>
              <div className="h-40 rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <SpatialMap
                  participants={room?.participants || []}
                  spatialPositions={spatialPositions}
                  myId={myId}
                  onPositionChange={(pos) => socket.emit('spatial:update', { code: room?.code, position: pos })}
                />
              </div>
            </div>
          </aside>
        </main>
      </div>

      {showShare && room?.code && (
        <ShareModal roomCode={room.code} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}
