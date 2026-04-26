import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SessionStatus } from '@ahorcado/shared';

import { RoundResultEntity } from '../game/entities/round-result.entity';
import { RoundEntity } from '../game/entities/round.entity';
import { GameSessionEntity } from '../sessions/entities/game-session.entity';
import { PlayerEntity } from '../sessions/entities/player.entity';

export interface LeaderboardRow {
  playerId: string;
  name: string;
  isHost: boolean;
  wins: number;
  roundsSolved: number;
  fastestSolveMs: number | null;
}

export interface RoundHistoryRow {
  roundNumber: number;
  word: string;
  categorySlug: string;
  winnerPlayerId: string | null;
  winnerName: string | null;
  startedAt: string;
  endedAt: string | null;
}

export interface LeaderboardResponse {
  exists: true;
  code: string;
  status: SessionStatus;
  totalRounds: number;
  currentRound: number;
  startedAt: string;
  finishedAt: string | null;
  winnerPlayerId: string | null;
  leaderboard: LeaderboardRow[];
  rounds: RoundHistoryRow[];
}

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(GameSessionEntity)
    private readonly sessionRepo: Repository<GameSessionEntity>,
    @InjectRepository(PlayerEntity)
    private readonly playerRepo: Repository<PlayerEntity>,
    @InjectRepository(RoundEntity)
    private readonly roundRepo: Repository<RoundEntity>,
    @InjectRepository(RoundResultEntity)
    private readonly resultRepo: Repository<RoundResultEntity>,
  ) {}

  async getByCode(code: string): Promise<LeaderboardResponse | { exists: false }> {
    const cleanCode = code.trim().toUpperCase();
    const session = await this.sessionRepo.findOne({ where: { code: cleanCode } });
    if (!session) return { exists: false };

    const [players, rounds] = await Promise.all([
      this.playerRepo.find({
        where: { sessionId: session.id },
        order: { joinedAt: 'ASC' },
      }),
      this.roundRepo.find({
        where: { sessionId: session.id },
        order: { roundNumber: 'ASC' },
      }),
    ]);

    const roundIds = rounds.map((r) => r.id);
    const results = roundIds.length
      ? await this.resultRepo.find({ where: roundIds.map((id) => ({ roundId: id })) })
      : [];

    const playerMap = new Map(players.map((p) => [p.id, p]));

    const stats = new Map<
      string,
      { wins: number; roundsSolved: number; fastestSolveMs: number | null }
    >();
    for (const p of players) {
      stats.set(p.id, { wins: 0, roundsSolved: 0, fastestSolveMs: null });
    }
    for (const r of rounds) {
      if (r.winnerPlayerId && stats.has(r.winnerPlayerId)) {
        stats.get(r.winnerPlayerId)!.wins += 1;
      }
    }
    for (const result of results) {
      const s = stats.get(result.playerId);
      if (!s) continue;
      if (result.solved) {
        s.roundsSolved += 1;
        if (result.solvedAtMs !== null) {
          const ms = parseInt(result.solvedAtMs, 10);
          if (!Number.isNaN(ms)) {
            // Convertimos en duración relativa al inicio de la ronda
            const round = rounds.find((r) => r.id === result.roundId);
            if (round) {
              const duration = ms - round.startedAt.getTime();
              if (
                duration > 0 &&
                (s.fastestSolveMs === null || duration < s.fastestSolveMs)
              ) {
                s.fastestSolveMs = duration;
              }
            }
          }
        }
      }
    }

    const leaderboard: LeaderboardRow[] = players
      .map((p) => {
        const s = stats.get(p.id)!;
        return {
          playerId: p.id,
          name: p.name,
          isHost: p.isHost,
          wins: s.wins,
          roundsSolved: s.roundsSolved,
          fastestSolveMs: s.fastestSolveMs,
        };
      })
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.roundsSolved !== a.roundsSolved)
          return b.roundsSolved - a.roundsSolved;
        return a.name.localeCompare(b.name);
      });

    const roundHistory: RoundHistoryRow[] = rounds.map((r) => ({
      roundNumber: r.roundNumber,
      word: r.wordDisplay,
      categorySlug: r.categorySlug,
      winnerPlayerId: r.winnerPlayerId,
      winnerName: r.winnerPlayerId
        ? playerMap.get(r.winnerPlayerId)?.name ?? null
        : null,
      startedAt: r.startedAt.toISOString(),
      endedAt: r.endedAt ? r.endedAt.toISOString() : null,
    }));

    return {
      exists: true,
      code: session.code,
      status: session.status,
      totalRounds: session.totalRounds,
      currentRound: session.currentRound,
      startedAt: session.createdAt.toISOString(),
      finishedAt: session.finishedAt ? session.finishedAt.toISOString() : null,
      winnerPlayerId: session.winnerPlayerId,
      leaderboard,
      rounds: roundHistory,
    };
  }
}
