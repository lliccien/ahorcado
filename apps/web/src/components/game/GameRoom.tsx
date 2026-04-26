import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ErrorCode,
  SessionStatus,
  type ErrorPayload,
} from '@ahorcado/shared';

import { useGameSocket } from '../../hooks/useGameSocket';
import { fetchSessionPublic } from '../../lib/api';
import { useGameStore } from '../../stores/gameStore';
import {
  clearPlayerId,
  getLastName,
  getPlayerId,
  setPlayerId,
} from '../../lib/storage';
import FinalLeaderboard from './FinalLeaderboard';
import LobbyView from './LobbyView';
import RoundResultModal from './RoundResultModal';
import RoundView from './RoundView';

interface Props {
  code: string;
  /** Nombre tentativo cuando el jugador llega vía /join?name=... */
  initialName?: string;
  /** True cuando llegamos por /play/[code]?host=1 inmediatamente tras crear */
  isHost?: boolean;
}

type Stage = 'connecting' | 'needsName' | 'joining' | 'ready' | 'fatal';

export default function GameRoom({ code, initialName = '', isHost = false }: Props) {
  const upperCode = code.toUpperCase();
  const { joinSession, startSession, nextRound, guess } = useGameSocket();

  const session = useGameStore((s) => s.session);
  const players = useGameStore((s) => s.players);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const setMyPlayerId = useGameStore((s) => s.setMyPlayerId);
  const setSession = useGameStore((s) => s.setSession);
  const setPlayers = useGameStore((s) => s.setPlayers);
  const setError = useGameStore((s) => s.setError);
  const error = useGameStore((s) => s.error);
  const connectionStatus = useGameStore((s) => s.connectionStatus);

  const currentRound = useGameStore((s) => s.currentRound);
  const myRoundState = useGameStore((s) => s.myRoundState);
  const opponents = useGameStore((s) => s.opponents);
  const scoreboard = useGameStore((s) => s.scoreboard);
  const lastRoundEnded = useGameStore((s) => s.lastRoundEnded);
  const finalLeaderboard = useGameStore((s) => s.finalLeaderboard);
  const setLastRoundEnded = useGameStore((s) => s.setLastRoundEnded);

  const joinedRef = useRef(false);
  const [stage, setStage] = useState<Stage>('connecting');
  const [pendingName, setPendingName] = useState<string>(
    () => initialName || getLastName(),
  );
  const [guessing, setGuessing] = useState(false);

  // -- Auto join al cargar la página ----------------------------------
  useEffect(() => {
    if (joinedRef.current) return;
    if (connectionStatus !== 'connected') return;

    const resumePlayerId = getPlayerId(upperCode) ?? undefined;

    async function tryAutoJoin() {
      try {
        const info = await fetchSessionPublic(upperCode);
        if (!info.exists) {
          setStage('fatal');
          setError({
            code: ErrorCode.SESSION_NOT_FOUND,
            message: 'No encontramos esa sala',
          });
          return;
        }
      } catch (err) {
        setStage('fatal');
        setError({
          code: ErrorCode.INTERNAL,
          message: err instanceof Error ? err.message : 'Error de red',
        });
        return;
      }

      const nameToUse = pendingName.trim() || initialName.trim();
      if (!resumePlayerId && !nameToUse) {
        setStage('needsName');
        return;
      }

      joinedRef.current = true;
      setStage('joining');
      const ack = await joinSession({
        code: upperCode,
        name: nameToUse || 'Jugador',
        resumePlayerId,
      });
      if ('code' in ack && 'message' in ack && !('playerId' in ack)) {
        const errPayload = ack as ErrorPayload;
        joinedRef.current = false;
        if (errPayload.code === ErrorCode.NAME_TAKEN) {
          setStage('needsName');
          return;
        }
        setStage('fatal');
        setError(errPayload);
        return;
      }
      setStage('ready');
    }

    void tryAutoJoin();
  }, [
    connectionStatus,
    upperCode,
    initialName,
    pendingName,
    joinSession,
    setError,
  ]);

  useEffect(() => {
    if (session && session.code === upperCode && stage !== 'ready') {
      const stored = getPlayerId(upperCode);
      if (stored && !myPlayerId) setMyPlayerId(stored);
      setStage('ready');
    }
  }, [session, upperCode, stage, myPlayerId, setMyPlayerId]);

  const handleStart = useCallback(async () => {
    return startSession();
  }, [startSession]);

  const handleAdvance = useCallback(async () => {
    setLastRoundEnded(null);
    await nextRound();
  }, [nextRound, setLastRoundEnded]);

  const handleLetter = useCallback(
    async (letter: string) => {
      setGuessing(true);
      try {
        await guess(letter);
      } finally {
        setGuessing(false);
      }
    },
    [guess],
  );

  // -- Renders --------------------------------------------------------
  if (stage === 'fatal') {
    return (
      <section className="mx-auto flex max-w-md flex-col gap-4 p-6 text-slate-100">
        <h2 className="text-xl font-bold">No pudimos entrar a la sala</h2>
        <p className="text-sm text-slate-300">
          {error?.message ?? 'Error desconocido'}
        </p>
        <div className="flex gap-2">
          <a
            href="/"
            className="rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/5"
          >
            Volver al inicio
          </a>
          <button
            type="button"
            onClick={() => {
              clearPlayerId(upperCode);
              setMyPlayerId(null);
              setSession(null);
              setPlayers([]);
              setError(null);
              joinedRef.current = false;
              setStage('connecting');
            }}
            className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300"
          >
            Reintentar
          </button>
        </div>
      </section>
    );
  }

  if (stage === 'needsName') {
    return (
      <section className="mx-auto flex max-w-md flex-col gap-4 p-6 text-slate-100">
        <h2 className="text-xl font-bold">¿Cómo te llamas?</h2>
        <p className="text-sm text-slate-300">
          Necesitamos un nombre para mostrarte en la sala {upperCode}.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const trimmed = pendingName.trim();
            if (trimmed.length < 2) return;
            joinedRef.current = true;
            setStage('joining');
            const ack = await joinSession({ code: upperCode, name: trimmed });
            if ('code' in ack && 'message' in ack && !('playerId' in ack)) {
              joinedRef.current = false;
              setStage('needsName');
              return;
            }
            if ('playerId' in ack && typeof ack.playerId === 'string') {
              setPlayerId(upperCode, ack.playerId);
            }
            setStage('ready');
          }}
          className="flex flex-col gap-3"
        >
          <input
            type="text"
            value={pendingName}
            onChange={(e) => setPendingName(e.target.value)}
            placeholder="Tu nombre"
            minLength={2}
            maxLength={20}
            required
            className="rounded-lg bg-slate-900 px-4 py-3 text-base text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {error && (
            <p className="text-sm text-red-300" role="alert">
              {error.message}
            </p>
          )}
          <button
            type="submit"
            className="rounded-xl bg-amber-400 px-4 py-3 font-semibold text-slate-950"
          >
            Entrar a {upperCode}
          </button>
        </form>
      </section>
    );
  }

  if (stage === 'connecting' || stage === 'joining' || !session) {
    return (
      <section className="mx-auto flex max-w-md flex-col items-center gap-3 p-6 text-slate-200">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-amber-300 border-t-transparent"
          aria-hidden
        />
        <p className="text-sm">Conectando a la sala {upperCode}…</p>
      </section>
    );
  }

  // -- Sesión finalizada → tabla final --------------------------------
  if (session.status === SessionStatus.FINISHED && finalLeaderboard) {
    return (
      <FinalLeaderboard
        payload={finalLeaderboard}
        players={players}
        myPlayerId={myPlayerId}
      />
    );
  }

  // -- Lobby ----------------------------------------------------------
  if (session.status === SessionStatus.LOBBY) {
    const userIsHost =
      isHost || (myPlayerId !== null && session.hostId === myPlayerId);
    return (
      <LobbyView
        session={session}
        players={players}
        myPlayerId={myPlayerId}
        isHost={userIsHost}
        onStart={handleStart}
      />
    );
  }

  // -- Ronda activa ---------------------------------------------------
  const userIsHost = myPlayerId !== null && session.hostId === myPlayerId;
  const showResult =
    lastRoundEnded !== null &&
    (session.status === SessionStatus.ROUND_ENDED ||
      session.status === SessionStatus.IN_PROGRESS);

  return (
    <>
      {currentRound && myRoundState ? (
        <RoundView
          session={session}
          round={currentRound}
          myState={myRoundState}
          players={players}
          myPlayerId={myPlayerId}
          opponents={opponents}
          scoreboard={scoreboard}
          guessing={guessing}
          onLetter={handleLetter}
        />
      ) : (
        <section className="mx-auto flex max-w-md flex-col items-center gap-3 p-6 text-slate-200">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-amber-300 border-t-transparent"
            aria-hidden
          />
          <p className="text-sm">Preparando ronda…</p>
        </section>
      )}

      {showResult && lastRoundEnded && (
        <RoundResultModal
          payload={lastRoundEnded}
          players={players}
          myPlayerId={myPlayerId}
          isHost={userIsHost}
          isFinalRound={lastRoundEnded.isFinalRound}
          onAdvance={handleAdvance}
        />
      )}
    </>
  );
}
