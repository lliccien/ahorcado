import { useEffect, useMemo, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

import {
  WS_NAMESPACE,
  type ClientToServerEvents,
  type CreateSessionAck,
  type CreateSessionPayload,
  type ErrorPayload,
  type JoinSessionAck,
  type JoinSessionPayload,
  type PlayerJoinedPayload,
  type PlayerLeftPayload,
  type PlayerReconnectedPayload,
  type ServerToClientEvents,
  type SessionState,
} from '@ahorcado/shared';

import { API_BASE_URL } from '../lib/api';
import { setPlayerId } from '../lib/storage';
import { useGameStore } from '../stores/gameStore';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function isErrorPayload(value: unknown): value is ErrorPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    !('playerId' in value) &&
    !('sessionId' in value)
  );
}

export interface UseGameSocketReturn {
  socket: GameSocket;
  createSession: (
    payload: CreateSessionPayload,
  ) => Promise<CreateSessionAck | ErrorPayload>;
  joinSession: (
    payload: JoinSessionPayload,
  ) => Promise<JoinSessionAck | ErrorPayload>;
  leaveSession: () => void;
}

export function useGameSocket(): UseGameSocketReturn {
  const socketRef = useRef<GameSocket | null>(null);

  const setConnectionStatus = useGameStore((s) => s.setConnectionStatus);
  const setSession = useGameStore((s) => s.setSession);
  const setPlayers = useGameStore((s) => s.setPlayers);
  const setMyPlayerId = useGameStore((s) => s.setMyPlayerId);
  const setError = useGameStore((s) => s.setError);

  if (!socketRef.current) {
    socketRef.current = io(`${API_BASE_URL}${WS_NAMESPACE}`, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }

  useEffect(() => {
    const sock = socketRef.current;
    if (!sock) return;

    const onConnect = () => setConnectionStatus('connected');
    const onDisconnect = () => setConnectionStatus('disconnected');
    const onConnectError = () => setConnectionStatus('error');
    const onReconnectAttempt = () => setConnectionStatus('reconnecting');

    const onSessionCreated = ({
      session,
    }: {
      code: string;
      session: SessionState;
    }) => setSession(session);

    const onPlayerJoined = (p: PlayerJoinedPayload) => setPlayers(p.players);
    const onPlayerLeft = (p: PlayerLeftPayload) => setPlayers(p.players);
    const onPlayerReconnected = (p: PlayerReconnectedPayload) =>
      setPlayers(p.players);

    const onError = (e: ErrorPayload) => setError(e);

    sock.on('connect', onConnect);
    sock.on('disconnect', onDisconnect);
    sock.on('connect_error', onConnectError);
    sock.io.on('reconnect_attempt', onReconnectAttempt);
    sock.on('session:created', onSessionCreated);
    sock.on('player:joined', onPlayerJoined);
    sock.on('player:left', onPlayerLeft);
    sock.on('player:reconnected', onPlayerReconnected);
    sock.on('error', onError);

    setConnectionStatus(sock.connected ? 'connected' : 'connecting');

    return () => {
      sock.off('connect', onConnect);
      sock.off('disconnect', onDisconnect);
      sock.off('connect_error', onConnectError);
      sock.io.off('reconnect_attempt', onReconnectAttempt);
      sock.off('session:created', onSessionCreated);
      sock.off('player:joined', onPlayerJoined);
      sock.off('player:left', onPlayerLeft);
      sock.off('player:reconnected', onPlayerReconnected);
      sock.off('error', onError);
    };
  }, [setConnectionStatus, setSession, setPlayers, setError]);

  // Limpieza solo al desmontar la app, no en cada render.
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const api = useMemo<UseGameSocketReturn>(() => {
    const sock = socketRef.current!;

    const createSession: UseGameSocketReturn['createSession'] = (payload) =>
      new Promise((resolve) => {
        setError(null);
        sock.emit('session:create', payload, (response) => {
          if (isErrorPayload(response)) {
            setError(response);
            resolve(response);
            return;
          }
          setMyPlayerId(response.hostPlayerId);
          setPlayerId(response.code, response.hostPlayerId);
          resolve(response);
        });
      });

    const joinSession: UseGameSocketReturn['joinSession'] = (payload) =>
      new Promise((resolve) => {
        setError(null);
        sock.emit('session:join', payload, (response) => {
          if (isErrorPayload(response)) {
            setError(response);
            resolve(response);
            return;
          }
          setSession(response.session);
          setPlayers(response.players);
          setMyPlayerId(response.playerId);
          setPlayerId(response.session.code, response.playerId);
          resolve(response);
        });
      });

    const leaveSession = () => {
      sock.emit('session:leave', {});
    };

    return { socket: sock, createSession, joinSession, leaveSession };
  }, [setError, setMyPlayerId, setPlayers, setSession]);

  return api;
}
