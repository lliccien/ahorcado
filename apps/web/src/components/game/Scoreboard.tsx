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
    <div className="sticky top-0 z-10 flex w-full items-center gap-2 bg-slate-950/80 px-2 py-1.5 backdrop-blur-md sm:gap-3 sm:px-3 sm:py-2 landscape:max-lg:py-1">
      <div className="text-[10px] text-slate-400 sm:text-xs">
        Ronda <span className="font-semibold text-slate-100">{currentRound}</span>
        <span className="mx-1">/</span>
        {totalRounds}
      </div>
      <div className="flex flex-1 gap-1.5 overflow-x-auto sm:gap-2">
        {sorted.map((entry) => (
          <span
            key={entry.playerId}
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] whitespace-nowrap sm:text-xs ${
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
