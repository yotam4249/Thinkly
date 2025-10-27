/* eslint-disable @typescript-eslint/no-explicit-any */
import { io, Socket } from "socket.io-client";
import { TokenManager } from "./api";

let socket: Socket | null = null;

function socketBaseUrl() {
  const api = import.meta.env.VITE_API_BASE as string; // "http://localhost:3000/api"
  return api.replace(/\/api\/?$/, "");                 // "http://localhost:3000"
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(socketBaseUrl(), {
      auth: { token: TokenManager.access ?? undefined },
      transports: ["websocket"],
      autoConnect: true,
    });
  }
  return socket;
}

export function updateSocketToken(newAccess: string | null) {
  if (!socket) return;
  (socket as any).auth = { token: newAccess ?? undefined };
  if (socket.connected) socket.disconnect();
  socket.connect();
}
