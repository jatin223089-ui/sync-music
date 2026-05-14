import { createContext, useContext, useState, useCallback } from 'react';

const RoomContext = createContext(null);

export function RoomProvider({ children }) {
  const [room, setRoom] = useState(null);
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('syncmusic_username') || '';
  });

  const updateRoom = useCallback((data) => {
    setRoom((prev) => (data ? { ...prev, ...data } : null));
  }, []);

  const saveName = useCallback((name) => {
    setUserName(name);
    localStorage.setItem('syncmusic_username', name);
  }, []);

  return (
    <RoomContext.Provider value={{ room, setRoom, updateRoom, userName, setUserName: saveName }}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom must be used within RoomProvider');
  return ctx;
}
