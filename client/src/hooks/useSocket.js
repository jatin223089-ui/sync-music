import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getBackendBaseUrl } from '../utils/siteUrl';

let sharedSocket = null;

export function useSocket() {
  const [connected, setConnected] = useState(() => !!sharedSocket?.connected);
  /** Last transport error — useful when the room page hangs on "joining". */
  const [lastConnectError, setLastConnectError] = useState('');

  useEffect(() => {
    if (!sharedSocket) {
      sharedSocket = io(getBackendBaseUrl(), {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 12,
        reconnectionDelayMax: 10_000,
      });
    }

    const sock = sharedSocket;

    const handleConnect = () => {
      setConnected(true);
      setLastConnectError('');
    };

    const handleDisconnect = () => setConnected(false);

    const handleConnectError = (err) => {
      const msg = typeof err?.message === 'string' ? err.message : 'Connection refused';
      setLastConnectError(msg);
    };

    sock.on('connect', handleConnect);
    sock.on('disconnect', handleDisconnect);
    sock.on('connect_error', handleConnectError);

    return () => {
      sock.off('connect', handleConnect);
      sock.off('disconnect', handleDisconnect);
      sock.off('connect_error', handleConnectError);
    };
  }, []);

  return { socket: sharedSocket, connected, lastConnectError };
}
