import { useCallback } from 'react';

import {
  type OpponentProgress,
  type Player,
  type PlayerRoundState,
  type RoundPublicState,
  type ScoreboardEntry,
  type SessionState,
} from '@ahorcado/shared';

import HangmanCanvas from './HangmanCanvas';
import Keyboard from './Keyboard';
import OpponentsBar from './OpponentsBar';
import Scoreboard from './Scoreboard';
import WordDisplay from './WordDisplay';

function countLetters(mask: Array<string | null>): number {
  let n = 0;
  for (const ch of mask) if (ch !== ' ') n++;
  return n;
}

interface Props {
  session: SessionState;
  round: RoundPublicState;
  myState: PlayerRoundState;
  players: Player[];
  myPlayerId: string | null;
  opponents: Record<string, OpponentProgress>;
  scoreboard: ScoreboardEntry[];
  guessing: boolean;
  onLetter: (letter: string) => void;
  onLeave: () => void;
}

export default function RoundView({
  session,
  round,
  myState,
  players,
  myPlayerId,
  opponents,
  scoreboard,
  guessing,
  onLetter,
  onLeave,
}: Props) {
  const handleLetter = useCallback(
    (letter: string) => {
      if (guessing) return;
      if (myState.solved) return;
      if (myState.livesRemaining <= 0) return;
      if (myState.guessed.includes(letter)) return;
      onLetter(letter);
    },
    [guessing, myState.solved, myState.livesRemaining, myState.guessed, onLetter],
  );

  const dead = myState.livesRemaining === 0 && !myState.solved;

  return (
    <section className="flex w-full flex-col">
      <Scoreboard
        scoreboard={scoreboard}
        myPlayerId={myPlayerId}
        currentRound={session.currentRound}
        totalRounds={session.totalRounds}
      />

      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-3 pb-4">
        <header className="flex items-center justify-between gap-2 text-xs uppercase tracking-widest text-slate-400">
          <button
            type="button"
            onClick={() => {
              if (confirm('¿Salir de la partida?')) onLeave();
            }}
            className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-slate-300 ring-1 ring-white/10 hover:bg-white/10"
            aria-label="Salir de la partida"
          >
            Salir
          </button>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-amber-400/10 px-3 py-1 font-semibold text-amber-200">
              {round.categoryName}
            </span>
            <span
              className="rounded-full bg-slate-800 px-2 py-1 font-mono text-[11px] text-slate-300"
              title="Letras en la palabra"
            >
              {countLetters(myState.maskedView)} letras
            </span>
          </div>
        </header>

        <HangmanCanvas livesRemaining={myState.livesRemaining} />

        <WordDisplay
          maskedView={myState.maskedView}
          solved={myState.solved}
        />

        <OpponentsBar
          players={players}
          myPlayerId={myPlayerId}
          opponents={opponents}
          round={round}
        />

        {(myState.solved || dead) && (
          <div
            role="status"
            className={`rounded-xl px-4 py-2 text-center text-sm ${
              myState.solved
                ? 'bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-400/40'
                : 'bg-red-500/10 text-red-200 ring-1 ring-red-400/40'
            }`}
          >
            {myState.solved
              ? '¡Adivinaste! Esperando a los demás…'
              : 'Te quedaste sin vidas. Espera el final de la ronda.'}
          </div>
        )}

        <Keyboard
          guessed={myState.guessed}
          maskedView={myState.maskedView}
          disabled={myState.solved || dead || guessing}
          onLetter={handleLetter}
        />
      </div>
    </section>
  );
}
