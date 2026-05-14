import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { getBackendBaseUrl } from '../utils/siteUrl';

let sharedSocket = null;

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!sharedSocket) {
      sharedSocket = io(getBackendBaseUrl(), { transports: ['websocket', 'polling'] });
    }
    socketRef.current = sharedSocket;

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    sharedSocket.on('connect', handleConnect);
    sharedSocket.on('disconnect', handleDisconnect);

    if (sharedSocket.connected) setConnected(true);

    return () => {
      sharedSocket.off('connect', handleConnect);
      sharedSocket.off('disconnect', handleDisconnect);
    };
  }, []);

  return { socket: socketRef.current, connected };
}
