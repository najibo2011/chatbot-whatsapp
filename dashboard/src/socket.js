import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';

export function createSocket() {
  return io(SOCKET_URL);
}
