import type { SessionStatus, WordDifficulty } from './enums.js';

export interface Category {
  slug: string;
  name: string;
  icon: string;
  locale: string;
  wordCount: number;
}

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  connected: boolean;
  joinedAt: number;
}

export interface SessionState {
  id: string;
  code: string;
  status: SessionStatus;
  totalRounds: number;
  currentRound: number;
  categorySlug: string;
  locale: string;
  hostId: string;
  createdAt: number;
}

export interface MaskedWord {
  length: number;
  display: string;
  revealed: Array<string | null>;
}

export interface RoundPublicState {
  roundNumber: number;
  categoryName: string;
  maskedLength: number;
  startedAt: number;
  endedAt: number | null;
  winnerId: string | null;
  livesPerPlayer: number;
}

export interface PlayerRoundState {
  playerId: string;
  livesRemaining: number;
  guessed: string[];
  maskedView: Array<string | null>;
  revealedCount: number;
  solved: boolean;
  solvedAtMs: number | null;
}

export interface OpponentProgress {
  playerId: string;
  livesRemaining: number;
  revealedCount: number;
  solved: boolean;
}

export interface RoundPlayerSummary {
  playerId: string;
  name: string;
  livesRemaining: number;
  solved: boolean;
  solvedAtMs: number | null;
}

export interface ScoreboardEntry {
  playerId: string;
  name: string;
  wins: number;
}

export interface RoundEndedPayload {
  roundNumber: number;
  winnerId: string | null;
  word: string;
  perPlayer: RoundPlayerSummary[];
  scoreboard: ScoreboardEntry[];
  isFinalRound: boolean;
}

export interface GameFinishedPayload {
  sessionCode: string;
  leaderboard: ScoreboardEntry[];
  totalRounds: number;
}

export interface SessionSnapshot {
  session: SessionState;
  players: Player[];
  currentRound: RoundPublicState | null;
  myState: PlayerRoundState | null;
  scoreboard: ScoreboardEntry[];
}

export interface WordSummary {
  difficulty: WordDifficulty;
  length: number;
}
