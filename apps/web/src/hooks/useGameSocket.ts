import { useEffect, useMemo, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

import {
  WS_NAMESPACE,
  type ClientToServerEvents,
  type CreateSessionAck,
  type CreateSessionPayload,
  type ErrorPayload,
  type GameFinishedPayload,
  type GuessLetterResult,
  type JoinSessionAck,
  type JoinSessionPayload,
  type OpponentProgress,
  type PlayerJoinedPayload,
  type PlayerLeftPayload,
  type PlayerReconnectedPayload,
  type RoundEndedPayload,
  type RoundStartedPayload,
  type ServerToClientEvents,
  type SessionState,
  type SessionStartedPayload,
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
    !('sessionId' in value) &&
    !('hit' in value)
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
  startSession: () => Promise<{ ok: true } | ErrorPayload>;
  nextRound: () => Promise<{ ok: true } | ErrorPayload>;
  guess: (letter: string) => Promise<GuessLetterResult | ErrorPayload>;
}

export function useGameSocket(): UseGameSocketReturn {
  const socketRef = useRef<GameSocket | null>(null);

  const setConnectionStatus = useGameStore((s) => s.setConnectionStatus);
  const setSession = useGameStore((s) => s.setSession);
  const setPlayers = useGameStore((s) => s.setPlayers);
  const setMyPlayerId = useGameStore((s) => s.setMyPlayerId);
  const setError = useGameStore((s) => s.setError);
  const setCurrentRound = useGameStore((s) => s.setCurrentRound);
  const setMyRoundState = useGameStore((s) => s.setMyRoundState);
  const patchMyRoundState = useGameStore((s) => s.patchMyRoundState);
  const setOpponentProgress = useGameStore((s) => s.setOpponentProgress);
  const resetOpponents = useGameStore((s) => s.resetOpponents);
  const setScoreboard = useGameStore((s) => s.setScoreboard);
  const setLastRoundEnded = useGameStore((s) => s.setLastRoundEnded);
  const setFinalLeaderboard = useGameStore((s) => s.setFinalLeaderboard);

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

    const onSessionCreated = ({ session }: { code: string; session: SessionState }) =>
      setSession(session);
    const onSessionStarted = (p: SessionStartedPayload) => {
      setSession(p.session);
      setLastRoundEnded(null);
      setFinalLeaderboard(null);
    };
    const onPlayerJoined = (p: PlayerJoinedPayload) => setPlayers(p.players);
    const onPlayerLeft = (p: PlayerLeftPayload) => setPlayers(p.players);
    const onPlayerReconnected = (p: PlayerReconnectedPayload) =>
      setPlayers(p.players);

    const onRoundStarted = (p: RoundStartedPayload) => {
      setCurrentRound(p.round);
      setMyRoundState(p.myState);
      resetOpponents();
      setLastRoundEnded(null);
    };
    const onOpponentProgress = (p: OpponentProgress) => setOpponentProgress(p);
    const onRoundEnded = (p: RoundEndedPayload) => {
      setLastRoundEnded(p);
      setScoreboard(p.scoreboard);
    };
    const onGameFinished = (p: GameFinishedPayload) => {
      setFinalLeaderboard(p);
      setScoreboard(p.leaderboard);
    };
    const onError = (e: ErrorPayload) => setError(e);

    sock.on('connect', onConnect);
    sock.on('disconnect', onDisconnect);
    sock.on('connect_error', onConnectError);
    sock.io.on('reconnect_attempt', onReconnectAttempt);
    sock.on('session:created', onSessionCreated);
    sock.on('session:started', onSessionStarted);
    sock.on('player:joined', onPlayerJoined);
    sock.on('player:left', onPlayerLeft);
    sock.on('player:reconnected', onPlayerReconnected);
    sock.on('round:started', onRoundStarted);
    sock.on('round:opponentProgress', onOpponentProgress);
    sock.on('round:ended', onRoundEnded);
    sock.on('game:finished', onGameFinished);
    sock.on('error', onError);

    setConnectionStatus(sock.connected ? 'connected' : 'connecting');

    return () => {
      sock.off('connect', onConnect);
      sock.off('disconnect', onDisconnect);
      sock.off('connect_error', onConnectError);
      sock.io.off('reconnect_attempt', onReconnectAttempt);
      sock.off('session:created', onSessionCreated);
      sock.off('session:started', onSessionStarted);
      sock.off('player:joined', onPlayerJoined);
      sock.off('player:left', onPlayerLeft);
      sock.off('player:reconnected', onPlayerReconnected);
      sock.off('round:started', onRoundStarted);
      sock.off('round:opponentProgress', onOpponentProgress);
      sock.off('round:ended', onRoundEnded);
      sock.off('game:finished', onGameFinished);
      sock.off('error', onError);
    };
  }, [
    setConnectionStatus,
    setSession,
    setPlayers,
    setError,
    setCurrentRound,
    setMyRoundState,
    setOpponentProgress,
    resetOpponents,
    setScoreboard,
    setLastRoundEnded,
    setFinalLeaderboard,
  ]);

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

    const startSession: UseGameSocketReturn['startSession'] = () =>
      new Promise((resolve) => {
        setError(null);
        sock.emit('session:start', {}, (response) => {
          if (response && isErrorPayload(response)) setError(response);
          resolve(response ?? ({ ok: true } as { ok: true }));
        });
      });

    const nextRound: UseGameSocketReturn['nextRound'] = () =>
      new Promise((resolve) => {
        setError(null);
        sock.emit('host:nextRound', {}, (response) => {
          if (response && isErrorPayload(response)) setError(response);
          resolve(response ?? ({ ok: true } as { ok: true }));
        });
      });

    const guess: UseGameSocketReturn['guess'] = (letter) =>
      new Promise((resolve) => {
        sock.emit('round:guess', { letter }, (response) => {
          if (response && isErrorPayload(response)) {
            setError(response);
            resolve(response);
            return;
          }
          if (response) {
            // Actualizar mi estado optimistamente con la respuesta
            patchMyRoundState({
              guessed: response.guessed,
              livesRemaining: response.livesRemaining,
              maskedView: response.maskedView,
              revealedCount: response.maskedView.filter(
                (c) => c !== null && c !== ' ',
              ).length,
              solved: response.solved,
            });
          }
          resolve(response as GuessLetterResult);
        });
      });

    return {
      socket: sock,
      createSession,
      joinSession,
      leaveSession,
      startSession,
      nextRound,
      guess,
    };
  }, [
    setError,
    setMyPlayerId,
    setPlayers,
    setSession,
    patchMyRoundState,
  ]);

  return api;
}
