const rooms = new Map();
const MAX_PLAYLIST_SIZE = 500;

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function createRoom(hostId, hostName) {
  let code;
  do {
    code = generateRoomCode();
  } while (rooms.has(code));

  const room = {
    code,
    hostId,
    participants: [{ id: hostId, name: hostName, isHost: true, joinedAt: Date.now() }],
    playlist: [],
    currentTrack: null,
    playbackState: {
      isPlaying: false,
      currentTime: 0,
      startedAt: null,
      trackIndex: -1,
    },
    chat: [],
    spatialPositions: {},
    createdAt: Date.now(),
  };

  rooms.set(code, room);
  return room;
}

function joinRoom(code, userId, userName) {
  const room = rooms.get(code);
  if (!room) return null;

  const existing = room.participants.find((p) => p.id === userId);
  if (!existing) {
    room.participants.push({ id: userId, name: userName, isHost: false, joinedAt: Date.now() });
  }
  return room;
}

function leaveRoom(code, userId) {
  const room = rooms.get(code);
  if (!room) return null;

  room.participants = room.participants.filter((p) => p.id !== userId);
  delete room.spatialPositions[userId];

  if (room.participants.length === 0) {
    rooms.delete(code);
    return null;
  }

  if (room.hostId === userId && room.participants.length > 0) {
    room.hostId = room.participants[0].id;
    room.participants[0].isHost = true;
  }

  return room;
}

function getRoom(code) {
  return rooms.get(code) || null;
}

function addTrackToRoom(code, track) {
  const room = rooms.get(code);
  if (!room) return null;
  if (room.playlist.length >= MAX_PLAYLIST_SIZE) return null;
  room.playlist.push(track);
  if (room.playbackState.trackIndex === -1) {
    room.playbackState.trackIndex = 0;
    room.currentTrack = track;
  }
  return room;
}

function updatePlayback(code, state) {
  const room = rooms.get(code);
  if (!room) return null;
  room.playbackState = { ...room.playbackState, ...state };
  return room;
}

function addChatMessage(code, message) {
  const room = rooms.get(code);
  if (!room) return null;
  room.chat.push(message);
  if (room.chat.length > 100) room.chat.shift();
  return room;
}

function updateSpatialPosition(code, userId, position) {
  const room = rooms.get(code);
  if (!room) return null;
  room.spatialPositions[userId] = position;
  return room;
}

function getRoomStats() {
  let totalListeners = 0;
  rooms.forEach((r) => { totalListeners += r.participants.length; });
  return { activeRooms: rooms.size, totalListeners };
}

module.exports = {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoom,
  addTrackToRoom,
  updatePlayback,
  addChatMessage,
  updateSpatialPosition,
  getRoomStats,
};
