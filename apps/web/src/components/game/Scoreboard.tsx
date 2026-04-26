import type { ScoreboardEntry } from '@ahorcado/shared';

interface Props {
  scoreboard: ScoreboardEntry[];
  myPlayerId: string | null;
  currentRound: number;
  totalRounds: number;
}

export default function Scoreboard({
  scoreboard,
  myPlayerId,
  currentRound,
  totalRounds,
}: Props) {
  const sorted = [...scoreboard].sort((a, b) => b.wins - a.wins);
  return (
    <div className="sticky top-0 z-10 flex w-full items-center gap-3 bg-slate-950/80 px-3 py-2 backdrop-blur-md">
      <div className="text-xs text-slate-400">
        Ronda <span className="font-semibold text-slate-100">{currentRound}</span>
        <span className="mx-1">/</span>
        {totalRounds}
      </div>
      <div className="flex flex-1 gap-2 overflow-x-auto">
        {sorted.map((entry) => (
          <span
            key={entry.playerId}
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs whitespace-nowrap ${
              entry.playerId === myPlayerId
                ? 'bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/40'
                : 'bg-white/5 text-slate-200 ring-1 ring-white/10'
            }`}
          >
            <span className="font-semibold">{entry.name}</span>
            <span className="text-amber-300">{entry.wins}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
