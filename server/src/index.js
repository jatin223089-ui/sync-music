const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoom,
  addTrackToRoom,
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

function sanitizeTrack(track) {
  if (!track || typeof track !== 'object') return null;
  const name = typeof track.name === 'string' ? track.name.trim() : '';
  const artist = typeof track.artist === 'string' ? track.artist.trim() : 'Unknown Artist';
  const url = typeof track.url === 'string' ? track.url.trim() : '';
  if (!name || !url || url.length > 2048) return null;
  if (!/^https?:\/\//i.test(url)) return null;
  return { name: name.slice(0, 120), artist: artist.slice(0, 120), url };
}

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
  socket.on('room:create', ({ userName }, callback) => {
    const safeName = typeof userName === 'string' && userName.trim() ? userName.trim().slice(0, 60) : 'Host';
    const room = createRoom(socket.id, safeName);
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

  // Play/Pause sync
  socket.on('playback:play', ({ code, serverTime, currentTime, trackIndex }) => {
    const upperCode = normalizeCode(code);
    if (!upperCode) return;
    const hostRoom = getHostRoom(upperCode, socket.id);
    if (hostRoom.error) return;
    const safeTrackIndex = Number.isInteger(trackIndex) ? trackIndex : hostRoom.room.playbackState.trackIndex;
    const safeCurrentTime = Number.isFinite(currentTime) && currentTime >= 0 ? currentTime : 0;
    const startedAt = Date.now();
    const room = updatePlayback(upperCode, {
      isPlaying: true,
      currentTime: safeCurrentTime,
      startedAt,
      trackIndex: safeTrackIndex,
    });
    if (!room) return;
    if (Number.isInteger(safeTrackIndex) && room.playlist[safeTrackIndex]) {
      room.currentTrack = room.playlist[safeTrackIndex];
    }
    emitPlaybackSync(io, upperCode, room);
  });

  socket.on('playback:pause', ({ code, currentTime }) => {
    const upperCode = normalizeCode(code);
    if (!upperCode) return;
    const hostRoom = getHostRoom(upperCode, socket.id);
    if (hostRoom.error) return;
    const safeCurrentTime = Number.isFinite(currentTime) && currentTime >= 0 ? currentTime : hostRoom.room.playbackState.currentTime;
    const room = updatePlayback(upperCode, { isPlaying: false, currentTime: safeCurrentTime, startedAt: null });
    if (!room) return;
    emitPlaybackSync(io, upperCode, room);
  });

  socket.on('playback:seek', ({ code, currentTime }) => {
    const upperCode = normalizeCode(code);
    if (!upperCode) return;
    const hostRoom = getHostRoom(upperCode, socket.id);
    if (hostRoom.error) return;
    const safeCurrentTime = Number.isFinite(currentTime) && currentTime >= 0 ? currentTime : hostRoom.room.playbackState.currentTime;
    const room = updatePlayback(upperCode, { currentTime: safeCurrentTime, startedAt: Date.now() });
    if (!room) return;
    emitPlaybackSync(io, upperCode, room);
  });

  socket.on('playback:next', ({ code }) => {
    const upperCode = normalizeCode(code);
    if (!upperCode) return;
    const hostRoom = getHostRoom(upperCode, socket.id);
    if (hostRoom.error) return;
    const room = hostRoom.room;
    if (!room) return;
    if (!room.playlist.length) return;
    const nextIndex = Math.min(room.playbackState.trackIndex + 1, room.playlist.length - 1);
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
    const hostRoom = getHostRoom(upperCode, socket.id);
    if (hostRoom.error) return;
    const room = hostRoom.room;
    if (!room) return;
    if (!room.playlist.length) return;
    const prevIndex = Math.max(room.playbackState.trackIndex - 1, 0);
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
  return {
    code: room.code,
    hostId: room.hostId,
    participants: room.participants,
    playlist: room.playlist,
    currentTrack: room.currentTrack,
    playbackState: room.playbackState,
    chat: room.chat,
    spatialPositions: room.spatialPositions,
  };
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`sync.music server running on :${PORT}`));
