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
  type HostChangedPayload,
  type JoinSessionAck,
  type JoinSessionPayload,
  type OpponentProgress,
  type PlayerJoinedPayload,
  type PlayerLeftPayload,
  type PlayerReconnectedPayload,
  type RoundEndedPayload,
  type RoundStartedPayload,
  type ServerToClientEvents,
  type SessionSnapshot,
  type SessionState,
  type SessionStartedPayload,
} from '@ahorcado/shared';

import { API_BASE_URL } from '../lib/api';
import { setPlayerId } from '../lib/storage';
import { useGameStore } from '../stores/gameStore';
import { useToastStore } from '../stores/toastStore';

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
  resync: () => Promise<SessionSnapshot | ErrorPayload>;
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

  const applySnapshot = (snap: SessionSnapshot) => {
    setSession(snap.session);
    setPlayers(snap.players);
    setCurrentRound(snap.currentRound);
    setMyRoundState(snap.myState);
    resetOpponents();
    for (const op of snap.opponents) setOpponentProgress(op);
    setScoreboard(snap.scoreboard);
    setLastRoundEnded(snap.lastRoundEnded);
  };

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

    const onHostChanged = (p: HostChangedPayload) => {
      // Actualizamos players (con isHost flips) y patchamos session.hostId
      setPlayers(p.players);
      const cur = useGameStore.getState().session;
      if (cur) setSession({ ...cur, hostId: p.hostId });
      const me = useGameStore.getState().myPlayerId;
      const newHost = p.players.find((pl) => pl.id === p.hostId);
      if (newHost) {
        const text =
          me === p.hostId
            ? '¡Ahora tú eres el host!'
            : `${newHost.name} es el nuevo host`;
        useToastStore.getState().push(text, 'info');
      }
    };

    const onStateSync = (snap: SessionSnapshot) => applySnapshot(snap);

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
    const onError = (e: ErrorPayload) => {
      setError(e);
      useToastStore.getState().push(e.message, 'error');
    };

    sock.on('connect', onConnect);
    sock.on('disconnect', onDisconnect);
    sock.on('connect_error', onConnectError);
    sock.io.on('reconnect_attempt', onReconnectAttempt);
    sock.on('session:created', onSessionCreated);
    sock.on('session:started', onSessionStarted);
    sock.on('player:joined', onPlayerJoined);
    sock.on('player:left', onPlayerLeft);
    sock.on('player:reconnected', onPlayerReconnected);
    sock.on('host:changed', onHostChanged);
    sock.on('round:started', onRoundStarted);
    sock.on('round:opponentProgress', onOpponentProgress);
    sock.on('round:ended', onRoundEnded);
    sock.on('game:finished', onGameFinished);
    sock.on('state:sync', onStateSync);
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
      sock.off('host:changed', onHostChanged);
      sock.off('round:started', onRoundStarted);
      sock.off('round:opponentProgress', onOpponentProgress);
      sock.off('round:ended', onRoundEnded);
      sock.off('game:finished', onGameFinished);
      sock.off('state:sync', onStateSync);
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
            useToastStore.getState().push(response.message, 'error');
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
            useToastStore.getState().push(response.message, 'error');
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
          if (response && isErrorPayload(response)) {
            setError(response);
            useToastStore.getState().push(response.message, 'error');
          }
          resolve(response ?? ({ ok: true } as { ok: true }));
        });
      });

    const nextRound: UseGameSocketReturn['nextRound'] = () =>
      new Promise((resolve) => {
        setError(null);
        sock.emit('host:nextRound', {}, (response) => {
          if (response && isErrorPayload(response)) {
            setError(response);
            useToastStore.getState().push(response.message, 'error');
          }
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
            patchMyRoundState({
              guessed: response.guessed,
              livesRemaining: response.livesRemaining,
              maskedView: response.maskedView,
              revealedCount: response.maskedView.filter(
                (c) => c !== null && c !== ' ',
              ).length,
              solved: response.solved,
            });

            // Feedback haptico (solo móviles soportados)
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              if (!response.hit) {
                if (response.livesRemaining === 0) {
                  navigator.vibrate([100, 50, 100, 50, 200]);
                } else {
                  navigator.vibrate(30);
                }
              } else if (response.solved) {
                navigator.vibrate([60, 40, 60, 40, 120]);
              }
            }
          }
          resolve(response as GuessLetterResult);
        });
      });

    const resync: UseGameSocketReturn['resync'] = () =>
      new Promise((resolve) => {
        sock.emit('state:resync', {}, (response) => {
          if (!response) {
            resolve({
              code: 'INTERNAL' as never,
              message: 'Sin respuesta del servidor',
            });
            return;
          }
          if (isErrorPayload(response)) {
            setError(response);
            resolve(response);
            return;
          }
          applySnapshot(response as SessionSnapshot);
          resolve(response as SessionSnapshot);
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
      resync,
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
