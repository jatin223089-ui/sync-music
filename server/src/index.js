const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const fs = require('fs');
const multer = require('multer');
const {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoom,
  addTrackToRoom,
  removeTrackFromRoom,
  updatePlayback,
  addChatMessage,
  updateSpatialPosition,
  getRoomStats,
} = require('./rooms');

const ROOM_CODE_REGEX = /^[A-Z0-9]{6}$/;
const MAX_CHAT_LENGTH = 500;
const ALLOWED_AUDIO_MIME = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/flac',
]);
const ALLOWED_AUDIO_EXT = new Set(['.mp3', '.wav', '.ogg', '.webm', '.mp4', '.m4a', '.aac', '.flac']);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: ALLOWED_ORIGINS.includes('*') ? '*' : ALLOWED_ORIGINS,
  methods: ['GET', 'POST'],
};

const app = express();
app.set('trust proxy', true);
app.use(cors(corsOptions));
app.use(express.json());

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) => {
    const rawExt = path.extname(file.originalname || '').toLowerCase();
    const ext = ALLOWED_AUDIO_EXT.has(rawExt) ? rawExt : '.mp3';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (_, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mimeOk = ALLOWED_AUDIO_MIME.has((file.mimetype || '').toLowerCase());
    const extOk = ALLOWED_AUDIO_EXT.has(ext);
    cb(null, mimeOk && extOk);
  },
});

app.use('/uploads', express.static(uploadsDir));

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

/** Used by hosts (Render, Railway, Fly) for HTTP/WebSocket health probes. */
app.get('/health', (_req, res) => {
  res.status(200).type('text/plain').send('ok');
});

// REST: stats
app.get('/api/stats', (req, res) => {
  res.json(getRoomStats());
});

// REST: check room
app.get('/api/room/:code', (req, res) => {
  const room = getRoom(req.params.code.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json({ code: room.code, participantCount: room.participants.length });
});

// REST: upload host audio file and return public URL
app.post('/api/upload', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Audio file is required' });
  }

  const origin = `${req.protocol}://${req.get('host')}`;
  return res.json({
    name: req.file.originalname || 'Uploaded Audio',
    url: `${origin}/uploads/${req.file.filename}`,
  });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message || 'Upload failed' });
  }
  return next();
});

function normalizeCode(rawCode) {
  if (typeof rawCode !== 'string') return null;
  const code = rawCode.trim().toUpperCase();
  return ROOM_CODE_REGEX.test(code) ? code : null;
}

function safeAck(callback, payload) {
  if (typeof callback === 'function') callback(payload);
}

function getRoomAndMember(code, socketId) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  const participant = room.participants.find((p) => p.id === socketId);
  if (!participant) return { error: 'Not a room participant' };
  return { room, participant };
}

function getHostRoom(code, socketId) {
  const base = getRoomAndMember(code, socketId);
  if (base.error) return base;
  if (base.room.hostId !== socketId) return { error: 'Only host can perform this action' };
  return base;
}

function normalizePlaybackPermissions(raw) {
  return raw === 'admins' ? 'admins' : 'everyone';
}

function normalizeGlobalVolume(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 1;
  return Math.max(0, Math.min(1, n));
}

/** Playback transport (play/pause/seek/next/prev): everyone or host-only. */
function assertPlaybackControl(room, socketId) {
  if (!room) return { error: 'Room not found' };
  const participant = room.participants.find((p) => p.id === socketId);
  if (!participant) return { error: 'Not a room participant' };
  const mode = normalizePlaybackPermissions(room.playbackPermissions);
  if (mode === 'admins' && room.hostId !== socketId) {
    return { error: 'Only the host can control playback' };
  }
  return { room, participant };
}

function sanitizeTrack(track) {
  if (!track || typeof track !== 'object') return null;
  const name = typeof track.name === 'string' ? track.name.trim() : '';
  const artistRaw = typeof track.artist === 'string' ? track.artist.trim() : '';
  const artist = artistRaw || 'Unknown Artist';
  const url = typeof track.url === 'string' ? track.url.trim() : '';
  if (!name || !url || url.length > 2048) return null;
  if (!/^https?:\/\//i.test(url)) return null;
  const out = {
    name: name.slice(0, 120),
    artist: artist.slice(0, 120),
    url,
  };
  const ds = Number(track.durationSeconds);
  if (Number.isFinite(ds) && ds > 0 && ds <= 86400) {
    out.durationSeconds = Math.round(ds);
  }
  if (typeof track.artwork === 'string') {
    const a = track.artwork.trim();
    if (/^https?:\/\//i.test(a) && a.length <= 2048) out.artwork = a;
  }
  if (typeof track.source === 'string' && track.source.trim()) {
    out.source = track.source.trim().slice(0, 40);
  }
  if (typeof track.isPreview === 'boolean') {
    out.isPreview = track.isPreview;
  }
  return out;
}

const MUSIC_SEARCH_TIMEOUT_MS = 12000;
/** Required — register at https://devportal.jamendo.com → create an app → Client Identifier */
const JAMENDO_CLIENT_ID = (String(process.env.JAMENDO_CLIENT_ID || '')).trim();

/**
 * Jamendo catalog search (CC-licensed library). Streams full tracks via the `audio` field.
 * @see https://developer.jamendo.com/v3.0/tracks
 */
app.get('/api/music/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) {
    return res.json({
      configured: JAMENDO_CLIENT_ID.length > 0,
      provider: 'jamendo',
      results: [],
    });
  }

  if (!JAMENDO_CLIENT_ID) {
    return res.json({
      configured: false,
      provider: 'jamendo',
      message: 'Set JAMENDO_CLIENT_ID on the server (free app at https://devportal.jamendo.com).',
      results: [],
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MUSIC_SEARCH_TIMEOUT_MS);

  try {
    const apiUrl = new URL('https://api.jamendo.com/v3.0/tracks/');
    apiUrl.searchParams.set('client_id', JAMENDO_CLIENT_ID);
    apiUrl.searchParams.set('format', 'json');
    apiUrl.searchParams.set('search', q);
    apiUrl.searchParams.set('limit', '25');
    apiUrl.searchParams.set('audioformat', 'mp32');
    apiUrl.searchParams.set('imagesize', '100');
    /* Include singles — default API filter is album tracks only */
    apiUrl.searchParams.set('type', 'single albumtrack');

    const r = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'BeatSync/1.0 (Jamendo catalog)',
      },
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      return res.status(502).json({
        configured: true,
        provider: 'jamendo',
        results: [],
        error: 'Jamendo HTTP error',
      });
    }

    if (!data || data.headers?.status !== 'success') {
      const msg = typeof data.headers?.error_message === 'string' && data.headers.error_message.trim()
        ? data.headers.error_message.trim()
        : 'Jamendo search failed';
      return res.status(502).json({
        configured: true,
        provider: 'jamendo',
        results: [],
        error: msg,
      });
    }

    const tracks = Array.isArray(data.results) ? data.results : [];
    const results = tracks
      .filter((t) => t && typeof t.audio === 'string' && /^https?:\/\//i.test(t.audio))
      .map((t) => {
        const img = typeof t.image === 'string' && t.image
          ? t.image
          : (typeof t.album_image === 'string' ? t.album_image : '');
        return {
          id: `jamendo-${t.id}`,
          name: String(t.name || 'Untitled').slice(0, 200),
          artist: String(t.artist_name || 'Unknown Artist').slice(0, 200),
          durationSeconds: Math.max(0, Math.round(Number(t.duration)) || 0),
          url: t.audio,
          artwork: img,
          source: 'jamendo',
          isPreview: false,
        };
      });

    return res.json({
      configured: true,
      provider: 'jamendo',
      disclaimer: 'Tracks stream from Jamendo (Creative Commons artists). Respect each track’s license; see jamendo.com for terms.',
      results,
    });
  } catch (err) {
    const aborted = err && err.name === 'AbortError';
    return res.status(aborted ? 504 : 502).json({
      configured: true,
      provider: 'jamendo',
      results: [],
      error: aborted ? 'Search timed out' : 'Search failed',
    });
  } finally {
    clearTimeout(timer);
  }
});

/** Full playback snapshot for clients (listeners + host UI). */
function playbackSyncPayload(room) {
  const ps = room.playbackState || {};
  const currentTime = Number.isFinite(ps.currentTime) ? ps.currentTime : 0;
  const isPlaying = !!ps.isPlaying;
  const startedAt = isPlaying && ps.startedAt != null ? ps.startedAt : null;
  const wall = Date.now();
  const serverTime = startedAt != null ? startedAt : wall;
  return {
    isPlaying,
    currentTime,
    serverTime,
    startedAt,
    trackIndex: ps.trackIndex,
    currentTrack: room.currentTrack || null,
  };
}

function emitPlaybackSync(io, roomCode, room) {
  io.to(roomCode).emit('playback:sync', playbackSyncPayload(room));
}

io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`);

  // NTP time sync
  socket.on('ntp:request', ({ clientSendTime }) => {
    socket.emit('ntp:response', {
      clientSendTime,
      serverReceiveTime: Date.now(),
      serverSendTime: Date.now(),
    });
  });

  // Create room
  socket.on('room:create', ({ userName, isPublic }, callback) => {
    const safeName = typeof userName === 'string' && userName.trim() ? userName.trim().slice(0, 60) : 'Host';
    const roomIsPublic = isPublic !== false;
    const room = createRoom(socket.id, safeName, { isPublic: roomIsPublic });
    socket.join(room.code);
    console.log(`[room] Created ${room.code} by ${socket.id}`);
    safeAck(callback, { success: true, room: sanitizeRoom(room) });
  });

  // Join room
  socket.on('room:join', ({ code, userName }, callback) => {
    const upperCode = normalizeCode(code);
    if (!upperCode) {
      safeAck(callback, { success: false, error: 'Invalid room code' });
      return;
    }
    const safeName = typeof userName === 'string' && userName.trim() ? userName.trim().slice(0, 60) : 'Listener';
    const room = joinRoom(upperCode, socket.id, safeName);
    if (!room) {
      safeAck(callback, { success: false, error: 'Room not found' });
      return;
    }
    socket.join(upperCode);
    socket.to(upperCode).emit('room:participant_joined', {
      participant: room.participants.find((p) => p.id === socket.id),
      participants: room.participants,
    });
    console.log(`[room] ${socket.id} joined ${upperCode}`);
    safeAck(callback, { success: true, room: sanitizeRoom(room) });
    // Personal sync so this client aligns audio immediately (listeners joining mid-session).
    socket.emit('playback:sync', playbackSyncPayload(room));
  });

  // Leave room
  socket.on('room:leave', ({ code }) => {
    const upperCode = normalizeCode(code);
    if (!upperCode) return;
    handleLeave(socket, upperCode);
  });

  // Host toggles invite label (does not gate join-by-code)
  socket.on('room:set_visibility', ({ code, isPublic }, callback) => {
    const upperCode = normalizeCode(code);
    if (!upperCode) {
      safeAck(callback, { success: false, error: 'Invalid room code' });
      return;
    }
    const hostRoom = getHostRoom(upperCode, socket.id);
    if (hostRoom.error) {
      safeAck(callback, { success: false, error: hostRoom.error });
      return;
    }
    hostRoom.room.isPublic = !!isPublic;
    io.to(upperCode).emit('room:visibility', { isPublic: hostRoom.room.isPublic });
    safeAck(callback, { success: true, isPublic: hostRoom.room.isPublic });
  });

  socket.on('room:set_playback_permissions', ({ code, playbackPermissions }, callback) => {
    const upperCode = normalizeCode(code);
    if (!upperCode) {
      safeAck(callback, { success: false, error: 'Invalid room code' });
      return;
    }
    const hostRoom = getHostRoom(upperCode, socket.id);
    if (hostRoom.error) {
      safeAck(callback, { success: false, error: hostRoom.error });
      return;
    }
    hostRoom.room.playbackPermissions = normalizePlaybackPermissions(playbackPermissions);
    io.to(upperCode).emit('room:settings', {
      playbackPermissions: hostRoom.room.playbackPermissions,
    });
    safeAck(callback, { success: true, playbackPermissions: hostRoom.room.playbackPermissions });
  });

  socket.on('room:set_global_volume', ({ code, globalVolume }, callback) => {
    const upperCode = normalizeCode(code);
    if (!upperCode) {
      safeAck(callback, { success: false, error: 'Invalid room code' });
      return;
    }
    const hostRoom = getHostRoom(upperCode, socket.id);
    if (hostRoom.error) {
      safeAck(callback, { success: false, error: hostRoom.error });
      return;
    }
    hostRoom.room.globalVolume = normalizeGlobalVolume(globalVolume);
    io.to(upperCode).emit('room:settings', {
      globalVolume: hostRoom.room.globalVolume,
    });
    safeAck(callback, { success: true, globalVolume: hostRoom.room.globalVolume });
  });

  // Add track
  socket.on('track:add', ({ code, track }, callback) => {
    const upperCode = normalizeCode(code);
    if (!upperCode) {
      safeAck(callback, { success: false, error: 'Invalid room code' });
      return;
    }
    const hostRoom = getHostRoom(upperCode, socket.id);
    if (hostRoom.error) {
      safeAck(callback, { success: false, error: hostRoom.error });
      return;
    }
    const safeTrack = sanitizeTrack(track);
    if (!safeTrack) {
      safeAck(callback, { success: false, error: 'Invalid track payload' });
      return;
    }
    const room = addTrackToRoom(upperCode, { ...safeTrack, id: Date.now().toString(), addedBy: socket.id });
    if (!room) {
      safeAck(callback, { success: false, error: 'Room not found' });
      return;
    }
    io.to(upperCode).emit('track:added', {
      playlist: room.playlist,
      currentTrack: room.currentTrack,
      trackIndex: room.playbackState.trackIndex,
    });
    safeAck(callback, { success: true });
  });

  socket.on('track:remove', ({ code, index }, callback) => {
    const upperCode = normalizeCode(code);
    if (!upperCode) {
      safeAck(callback, { success: false, error: 'Invalid room code' });
      return;
    }
    const hostRoom = getHostRoom(upperCode, socket.id);
    if (hostRoom.error) {
      safeAck(callback, { success: false, error: hostRoom.error });
      return;
    }
    const room = removeTrackFromRoom(upperCode, index);
    if (!room) {
      safeAck(callback, { success: false, error: 'Cannot remove track' });
      return;
    }
    io.to(upperCode).emit('track:added', {
      playlist: room.playlist,
      currentTrack: room.currentTrack,
      trackIndex: room.playbackState.trackIndex,
    });
    setImmediate(() => emitPlaybackSync(io, upperCode, room));
    safeAck(callback, { success: true });
  });

  // Play/Pause sync
  socket.on('playback:play', ({ code, serverTime, currentTime, trackIndex }) => {
    const upperCode = normalizeCode(code);
    if (!upperCode) return;
    const room = getRoom(upperCode);
    const auth = assertPlaybackControl(room, socket.id);
    if (auth.error) return;
    const safeTrackIndex = Number.isInteger(trackIndex) ? trackIndex : auth.room.playbackState.trackIndex;
    const safeCurrentTime = Number.isFinite(currentTime) && currentTime >= 0 ? currentTime : 0;
    const startedAt = Date.now();
    const updated = updatePlayback(upperCode, {
      isPlaying: true,
      currentTime: safeCurrentTime,
      startedAt,
      trackIndex: safeTrackIndex,
    });
    if (!updated) return;
    if (Number.isInteger(safeTrackIndex) && updated.playlist[safeTrackIndex]) {
      updated.currentTrack = updated.playlist[safeTrackIndex];
    }
    emitPlaybackSync(io, upperCode, updated);
  });

  socket.on('playback:pause', ({ code, currentTime }) => {
    const upperCode = normalizeCode(code);
    if (!upperCode) return;
    const room = getRoom(upperCode);
    const auth = assertPlaybackControl(room, socket.id);
    if (auth.error) return;
    const safeCurrentTime = Number.isFinite(currentTime) && currentTime >= 0 ? currentTime : auth.room.playbackState.currentTime;
    const updated = updatePlayback(upperCode, { isPlaying: false, currentTime: safeCurrentTime, startedAt: null });
    if (!updated) return;
    emitPlaybackSync(io, upperCode, updated);
  });

  socket.on('playback:seek', ({ code, currentTime }) => {
    const upperCode = normalizeCode(code);
    if (!upperCode) return;
    const room = getRoom(upperCode);
    const auth = assertPlaybackControl(room, socket.id);
    if (auth.error) return;
    const safeCurrentTime = Number.isFinite(currentTime) && currentTime >= 0 ? currentTime : auth.room.playbackState.currentTime;
    const updated = updatePlayback(upperCode, { currentTime: safeCurrentTime, startedAt: Date.now() });
    if (!updated) return;
    emitPlaybackSync(io, upperCode, updated);
  });

  socket.on('playback:next', ({ code }) => {
    const upperCode = normalizeCode(code);
    if (!upperCode) return;
    const room = getRoom(upperCode);
    const auth = assertPlaybackControl(room, socket.id);
    if (auth.error) return;
    const r = auth.room;
    if (!r) return;
    if (!r.playlist.length) return;
    const nextIndex = Math.min(r.playbackState.trackIndex + 1, r.playlist.length - 1);
    const updated = updatePlayback(upperCode, {
      trackIndex: nextIndex,
      currentTime: 0,
      isPlaying: true,
      startedAt: Date.now(),
    });
    if (!updated) return;
    updated.currentTrack = updated.playlist[nextIndex] || null;
    io.to(upperCode).emit('playback:track_changed', {
      trackIndex: nextIndex,
      currentTrack: updated.playlist[nextIndex] || null,
      serverTime: Date.now(),
    });
    // Defer full sync so clients can apply new track URL before play/seek (avoids race with loadAudio).
    setImmediate(() => emitPlaybackSync(io, upperCode, updated));
  });

  socket.on('playback:prev', ({ code }) => {
    const upperCode = normalizeCode(code);
    if (!upperCode) return;
    const room = getRoom(upperCode);
    const auth = assertPlaybackControl(room, socket.id);
    if (auth.error) return;
    const r = auth.room;
    if (!r) return;
    if (!r.playlist.length) return;
    const prevIndex = Math.max(r.playbackState.trackIndex - 1, 0);
    const updated = updatePlayback(upperCode, {
      trackIndex: prevIndex,
      currentTime: 0,
      isPlaying: true,
      startedAt: Date.now(),
    });
    if (!updated) return;
    updated.currentTrack = updated.playlist[prevIndex] || null;
    io.to(upperCode).emit('playback:track_changed', {
      trackIndex: prevIndex,
      currentTrack: updated.playlist[prevIndex] || null,
      serverTime: Date.now(),
    });
    setImmediate(() => emitPlaybackSync(io, upperCode, updated));
  });

  // Chat
  socket.on('chat:send', ({ code, message, userName }) => {
    const upperCode = normalizeCode(code);
    if (!upperCode || typeof message !== 'string') return;
    const roomMember = getRoomAndMember(upperCode, socket.id);
    if (roomMember.error) return;
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;
    const sender = typeof userName === 'string' && userName.trim()
      ? userName.trim().slice(0, 60)
      : roomMember.participant.name;
    const msg = {
      id: Date.now().toString(),
      userId: socket.id,
      userName: sender,
      message: trimmedMessage.slice(0, MAX_CHAT_LENGTH),
      timestamp: Date.now(),
    };
    addChatMessage(upperCode, msg);
    io.to(upperCode).emit('chat:message', msg);
  });

  // Spatial audio
  socket.on('spatial:update', ({ code, position }) => {
    const upperCode = normalizeCode(code);
    if (!upperCode || !position || typeof position !== 'object') return;
    const roomMember = getRoomAndMember(upperCode, socket.id);
    if (roomMember.error) return;
    const x = Number(position.x);
    const y = Number(position.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const safePosition = {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    };
    updateSpatialPosition(upperCode, socket.id, safePosition);
    socket.to(upperCode).emit('spatial:positions', { userId: socket.id, position: safePosition });
  });

  // Disconnect
  socket.on('disconnecting', () => {
    socket.rooms.forEach((roomCode) => {
      if (roomCode !== socket.id) handleLeave(socket, roomCode);
    });
  });

  function handleLeave(socket, code) {
    const room = leaveRoom(code, socket.id);
    socket.leave(code);
    if (room) {
      io.to(code).emit('room:participant_left', {
        userId: socket.id,
        participants: room.participants,
        newHostId: room.hostId,
      });
    }
  }
});

function sanitizeRoom(room) {
  const isPublic = room.isPublic !== false;
  return {
    code: room.code,
    hostId: room.hostId,
    isPublic,
    playbackPermissions: normalizePlaybackPermissions(room.playbackPermissions),
    globalVolume: normalizeGlobalVolume(room.globalVolume),
    participants: room.participants,
    playlist: room.playlist,
    currentTrack: room.currentTrack,
    playbackState: room.playbackState,
    chat: room.chat,
    spatialPositions: room.spatialPositions,
  };
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`sync.music server running on :${PORT}`);
  if (!JAMENDO_CLIENT_ID) {
    console.warn(
      '[jamendo] JAMENDO_CLIENT_ID is not set — catalog search disabled. '
      + 'Copy server/.env.example to server/.env and paste your Client ID from https://devportal.jamendo.com',
    );
  } else {
    console.log('[jamendo] Catalog search enabled');
  }
});
