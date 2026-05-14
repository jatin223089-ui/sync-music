const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
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

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
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
    const room = createRoom(socket.id, userName || 'Host');
    socket.join(room.code);
    console.log(`[room] Created ${room.code} by ${socket.id}`);
    callback({ success: true, room: sanitizeRoom(room) });
  });

  // Join room
  socket.on('room:join', ({ code, userName }, callback) => {
    const upperCode = code.toUpperCase();
    const room = joinRoom(upperCode, socket.id, userName || 'Listener');
    if (!room) {
      callback({ success: false, error: 'Room not found' });
      return;
    }
    socket.join(upperCode);
    socket.to(upperCode).emit('room:participant_joined', {
      participant: room.participants.find((p) => p.id === socket.id),
      participants: room.participants,
    });
    console.log(`[room] ${socket.id} joined ${upperCode}`);
    callback({ success: true, room: sanitizeRoom(room) });
  });

  // Leave room
  socket.on('room:leave', ({ code }) => {
    handleLeave(socket, code);
  });

  // Add track
  socket.on('track:add', ({ code, track }, callback) => {
    const room = addTrackToRoom(code, { ...track, id: Date.now().toString(), addedBy: socket.id });
    if (!room) { callback?.({ success: false }); return; }
    io.to(code).emit('track:added', { playlist: room.playlist, currentTrack: room.currentTrack });
    callback?.({ success: true });
  });

  // Play/Pause sync
  socket.on('playback:play', ({ code, serverTime, currentTime, trackIndex }) => {
    const room = updatePlayback(code, {
      isPlaying: true,
      currentTime,
      startedAt: serverTime || Date.now(),
      trackIndex,
    });
    if (!room) return;
    io.to(code).emit('playback:sync', {
      isPlaying: true,
      currentTime,
      serverTime: serverTime || Date.now(),
      trackIndex,
    });
  });

  socket.on('playback:pause', ({ code, currentTime }) => {
    const room = updatePlayback(code, { isPlaying: false, currentTime });
    if (!room) return;
    io.to(code).emit('playback:sync', { isPlaying: false, currentTime, serverTime: Date.now() });
  });

  socket.on('playback:seek', ({ code, currentTime }) => {
    const room = updatePlayback(code, { currentTime, startedAt: Date.now() });
    if (!room) return;
    io.to(code).emit('playback:sync', {
      isPlaying: room.playbackState.isPlaying,
      currentTime,
      serverTime: Date.now(),
      trackIndex: room.playbackState.trackIndex,
    });
  });

  socket.on('playback:next', ({ code }) => {
    const room = getRoom(code);
    if (!room) return;
    const nextIndex = Math.min(room.playbackState.trackIndex + 1, room.playlist.length - 1);
    const updated = updatePlayback(code, {
      trackIndex: nextIndex,
      currentTime: 0,
      isPlaying: true,
      startedAt: Date.now(),
    });
    if (!updated) return;
    io.to(code).emit('playback:track_changed', {
      trackIndex: nextIndex,
      currentTrack: updated.playlist[nextIndex] || null,
      serverTime: Date.now(),
    });
  });

  socket.on('playback:prev', ({ code }) => {
    const room = getRoom(code);
    if (!room) return;
    const prevIndex = Math.max(room.playbackState.trackIndex - 1, 0);
    const updated = updatePlayback(code, {
      trackIndex: prevIndex,
      currentTime: 0,
      isPlaying: true,
      startedAt: Date.now(),
    });
    if (!updated) return;
    io.to(code).emit('playback:track_changed', {
      trackIndex: prevIndex,
      currentTrack: updated.playlist[prevIndex] || null,
      serverTime: Date.now(),
    });
  });

  // Chat
  socket.on('chat:send', ({ code, message, userName }) => {
    const msg = { id: Date.now().toString(), userName, message, timestamp: Date.now() };
    addChatMessage(code, msg);
    io.to(code).emit('chat:message', msg);
  });

  // Spatial audio
  socket.on('spatial:update', ({ code, position }) => {
    updateSpatialPosition(code, socket.id, position);
    socket.to(code).emit('spatial:positions', { userId: socket.id, position });
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
