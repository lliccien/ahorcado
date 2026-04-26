import { useEffect, useState } from 'react';

import {
  ROUND_END_DELAY_MS,
  type Player,
  type RoundEndedPayload,
} from '@ahorcado/shared';

interface Props {
  payload: RoundEndedPayload;
  players: Player[];
  myPlayerId: string | null;
  isHost: boolean;
  isFinalRound: boolean;
  onAdvance: () => void;
}

export default function RoundResultModal({
  payload,
  players,
  myPlayerId,
  isHost,
  isFinalRound,
  onAdvance,
}: Props) {
  const [secondsLeft, setSecondsLeft] = useState(
    Math.round(ROUND_END_DELAY_MS / 1000),
  );

  useEffect(() => {
    if (!isHost) return;
    if (isFinalRound) return;
    setSecondsLeft(Math.round(ROUND_END_DELAY_MS / 1000));
    const id = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    const timeout = setTimeout(() => onAdvance(), ROUND_END_DELAY_MS);
    return () => {
      clearInterval(id);
      clearTimeout(timeout);
    };
  }, [isHost, isFinalRound, onAdvance, payload.roundNumber]);

  const winner = payload.winnerId
    ? players.find((p) => p.id === payload.winnerId) ?? null
    : null;
  const wonByMe = payload.winnerId !== null && payload.winnerId === myPlayerId;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6 text-slate-100 shadow-2xl ring-1 ring-white/10">
        <header className="mb-4 flex flex-col items-center gap-1 text-center">
          <p className="text-xs uppercase tracking-widest text-slate-400">
            Ronda {payload.roundNumber} · resultado
          </p>
          {wonByMe ? (
            <h2 className="text-2xl font-extrabold text-emerald-300">
              ¡Ganaste! 🎉
            </h2>
          ) : winner ? (
            <h2 className="text-2xl font-extrabold text-amber-300">
              Ganó {winner.name}
            </h2>
          ) : (
            <h2 className="text-2xl font-extrabold text-red-300">
              Sin ganador
            </h2>
          )}
        </header>

        <div className="mb-4 flex flex-col items-center gap-1 rounded-xl bg-slate-800/60 px-4 py-3">
          <span className="text-[11px] uppercase tracking-widest text-slate-400">
            La palabra era
          </span>
          <span className="font-mono text-2xl uppercase tracking-widest text-amber-200">
            {payload.word}
          </span>
        </div>

        <ul className="mb-4 flex flex-col gap-1">
          {payload.perPlayer.map((row) => (
            <li
              key={row.playerId}
              className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-sm"
            >
              <span className="flex-1 font-medium">{row.name}</span>
              <span
                className={
                  row.solved ? 'text-emerald-300' : 'text-slate-400'
                }
              >
                {row.solved ? 'resolvió' : 'no resolvió'}
              </span>
              <span className="text-xs text-slate-400">
                {row.livesRemaining} vidas
              </span>
            </li>
          ))}
        </ul>

        {isFinalRound ? (
          <button
            type="button"
            onClick={onAdvance}
            disabled={!isHost}
            className="w-full rounded-xl bg-amber-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50"
          >
            {isHost ? 'Ver resultado final' : 'Esperando al host…'}
          </button>
        ) : isHost ? (
          <button
            type="button"
            onClick={onAdvance}
            className="w-full rounded-xl bg-amber-400 px-4 py-3 font-semibold text-slate-950"
          >
            Siguiente ronda ({secondsLeft}s)
          </button>
        ) : (
          <p className="text-center text-sm text-slate-400">
            La siguiente ronda empieza pronto…
          </p>
        )}
      </div>
    </div>
  );
}
