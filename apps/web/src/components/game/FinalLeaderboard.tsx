import type { GameFinishedPayload, Player } from '@ahorcado/shared';

interface Props {
  payload: GameFinishedPayload;
  players: Player[];
  myPlayerId: string | null;
}

export default function FinalLeaderboard({
  payload,
  players,
  myPlayerId,
}: Props) {
  const sorted = [...payload.leaderboard].sort((a, b) => b.wins - a.wins);
  const [first] = sorted;
  const champion =
    first && players.find((p) => p.id === first.playerId);
  const wonByMe = first && first.playerId === myPlayerId;

  return (
    <section
      className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 pb-10 pt-6 text-slate-100 md:max-w-xl lg:max-w-2xl"
      data-testid="final-leaderboard"
    >
      <header className="flex flex-col items-center gap-2 text-center">
        <span className="text-5xl md:text-6xl lg:text-7xl" aria-hidden>
          🏆
        </span>
        <h2 className="text-2xl font-extrabold md:text-3xl lg:text-4xl">
          {wonByMe
            ? '¡Ganaste la partida!'
            : champion
              ? `Ganador: ${champion.name}`
              : 'Partida finalizada'}
        </h2>
        <p className="text-sm text-slate-400">
          {payload.totalRounds} rondas jugadas · sala {payload.sessionCode}
        </p>
      </header>

      <ol className="flex flex-col gap-2">
        {sorted.map((entry, idx) => (
          <li
            key={entry.playerId}
            data-testid="final-leaderboard-row"
            className={`flex items-center gap-3 rounded-xl px-3 py-3 ${
              idx === 0
                ? 'bg-amber-400/15 ring-1 ring-amber-300/50'
                : 'bg-white/5 ring-1 ring-white/10'
            }`}
          >
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 font-bold"
            >
              {idx + 1}
            </span>
            <span className="flex-1 truncate text-base font-medium">
              {entry.name}
              {entry.playerId === myPlayerId && (
                <span className="ml-2 text-xs text-amber-300">(tú)</span>
              )}
            </span>
            <span className="font-mono text-lg font-bold text-amber-200">
              {entry.wins}
            </span>
          </li>
        ))}
      </ol>

      <a
        href="/host"
        className="rounded-2xl bg-amber-400 px-5 py-4 text-center text-lg font-semibold text-slate-950 shadow-md transition hover:bg-amber-300"
        data-testid="final-leaderboard-new-game"
      >
        Nueva partida
      </a>
    </section>
  );
}
