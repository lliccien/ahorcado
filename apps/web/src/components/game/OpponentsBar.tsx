import {
  LIVES_PER_ROUND,
  type OpponentProgress,
  type Player,
  type RoundPublicState,
} from '@ahorcado/shared';

interface Props {
  players: Player[];
  myPlayerId: string | null;
  opponents: Record<string, OpponentProgress>;
  round: RoundPublicState;
}

export default function OpponentsBar({
  players,
  myPlayerId,
  opponents,
  round,
}: Props) {
  const others = players.filter((p) => p.id !== myPlayerId);
  if (others.length === 0) return null;
  return (
    <div className="flex w-full gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible">
      {others.map((p) => {
        const op = opponents[p.id];
        const lives = op?.livesRemaining ?? LIVES_PER_ROUND;
        const revealed = op?.revealedCount ?? 0;
        const total = round.maskedLength;
        const percent = total > 0 ? Math.round((revealed / total) * 100) : 0;
        const solved = op?.solved ?? false;
        const dead = lives === 0 && !solved;
        return (
          <div
            key={p.id}
            className={`flex min-w-[160px] flex-col gap-1 rounded-xl border px-3 py-2 ${
              solved
                ? 'border-emerald-400/50 bg-emerald-400/10'
                : dead
                  ? 'border-red-500/40 bg-red-500/10 opacity-70'
                  : 'border-white/10 bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-sm font-bold uppercase"
              >
                {p.name.slice(0, 1)}
              </span>
              <span className="flex-1 truncate text-sm font-medium text-slate-100">
                {p.name}
              </span>
              {solved && (
                <span className="text-[10px] font-bold uppercase text-emerald-300">
                  ¡Ganó!
                </span>
              )}
              {dead && (
                <span className="text-[10px] font-bold uppercase text-red-300">
                  Sin vidas
                </span>
              )}
            </div>
            <div className="flex items-center gap-1" aria-label="Vidas">
              {Array.from({ length: LIVES_PER_ROUND }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-3 rounded-sm ${
                    i < lives ? 'bg-amber-300' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <div
              className="h-1 w-full overflow-hidden rounded bg-slate-700"
              aria-label={`Progreso ${percent}%`}
            >
              <div
                className={`h-full transition-all ${
                  solved ? 'bg-emerald-400' : 'bg-amber-300'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
