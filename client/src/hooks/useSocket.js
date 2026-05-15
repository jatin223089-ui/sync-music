import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getBackendBaseUrl } from '../utils/siteUrl';

let sharedSocket = null;

export function useSocket() {
  const [connected, setConnected] = useState(() => !!sharedSocket?.connected);

  useEffect(() => {
    if (!sharedSocket) {
      sharedSocket = io(getBackendBaseUrl(), { transports: ['websocket', 'polling'] });
    }

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    sharedSocket.on('connect', handleConnect);
    sharedSocket.on('disconnect', handleDisconnect);

    return () => {
      sharedSocket.off('connect', handleConnect);
      sharedSocket.off('disconnect', handleDisconnect);
    };
  }, []);

  return { socket: sharedSocket, connected };
}
