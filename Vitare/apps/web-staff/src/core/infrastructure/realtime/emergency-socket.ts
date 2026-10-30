/**
 * Cliente Socket.IO do feed operacional: integra o Gateway do backend com
 * autenticação pelo MESMO token de staff usado nas chamadas REST. Eventos
 * são apenas sinais operacionais (sem dados clínicos) — a UI SEMPRE
 * revalida via HTTP (fallback garantido pelo polling do TanStack Query).
 */
import { io, type Socket } from "socket.io-client";
import { staffSessionStorage } from "../session/staff-session.storage";

let socket: Socket | null = null;

export function connectStaffSocket(onOperationalEvent: () => void): () => void {
  const token = staffSessionStorage.getAccessToken();
  if (!token) return () => undefined;

  if (!socket) {
    const base = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
    // /api/v1 → origem do socket é a raiz do host (path padrão /socket.io).
    const origin = base
      ? base.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "") || undefined
      : undefined;

    socket = io(origin, {
      path: "/socket.io",
      auth: { token },
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 2_000,
      reconnectionAttempts: Infinity,
    });
  }

  const handler = () => onOperationalEvent();
  socket.on("emergency.triggered", handler);
  socket.on("emergency.accepted", handler);
  socket.on("emergency.resolved", handler);

  return () => {
    socket?.off("emergency.triggered", handler);
    socket?.off("emergency.accepted", handler);
    socket?.off("emergency.resolved", handler);
  };
}
