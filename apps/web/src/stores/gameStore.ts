import { create } from 'zustand';

import type {
  ErrorPayload,
  GameFinishedPayload,
  OpponentProgress,
  Player,
  PlayerRoundState,
  RoundEndedPayload,
  RoundPublicState,
  ScoreboardEntry,
  SessionState,
} from '@ahorcado/shared';

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

interface GameStoreState {
  connectionStatus: ConnectionStatus;
  session: SessionState | null;
  players: Player[];
  myPlayerId: string | null;
  error: ErrorPayload | null;

  currentRound: RoundPublicState | null;
  myRoundState: PlayerRoundState | null;
  opponents: Record<string, OpponentProgress>;
  scoreboard: ScoreboardEntry[];
  lastRoundEnded: RoundEndedPayload | null;
  finalLeaderboard: GameFinishedPayload | null;

  setConnectionStatus: (status: ConnectionStatus) => void;
  setSession: (session: SessionState | null) => void;
  setPlayers: (players: Player[]) => void;
  setMyPlayerId: (id: string | null) => void;
  setError: (error: ErrorPayload | null) => void;

  setCurrentRound: (round: RoundPublicState | null) => void;
  setMyRoundState: (state: PlayerRoundState | null) => void;
  patchMyRoundState: (patch: Partial<PlayerRoundState>) => void;
  setOpponentProgress: (progress: OpponentProgress) => void;
  resetOpponents: () => void;
  setScoreboard: (entries: ScoreboardEntry[]) => void;
  setLastRoundEnded: (payload: RoundEndedPayload | null) => void;
  setFinalLeaderboard: (payload: GameFinishedPayload | null) => void;

  reset: () => void;
}

const initial = {
  connectionStatus: 'idle' as ConnectionStatus,
  session: null,
  players: [] as Player[],
  myPlayerId: null,
  error: null,
  currentRound: null,
  myRoundState: null,
  opponents: {} as Record<string, OpponentProgress>,
  scoreboard: [] as ScoreboardEntry[],
  lastRoundEnded: null,
  finalLeaderboard: null,
};

export const useGameStore = create<GameStoreState>((set, get) => ({
  ...initial,
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setSession: (session) => set({ session }),
  setPlayers: (players) => set({ players }),
  setMyPlayerId: (myPlayerId) => set({ myPlayerId }),
  setError: (error) => set({ error }),

  setCurrentRound: (currentRound) => set({ currentRound }),
  setMyRoundState: (myRoundState) => set({ myRoundState }),
  patchMyRoundState: (patch) => {
    const cur = get().myRoundState;
    if (!cur) return;
    set({ myRoundState: { ...cur, ...patch } });
  },
  setOpponentProgress: (progress) => {
    const map = { ...get().opponents, [progress.playerId]: progress };
    set({ opponents: map });
  },
  resetOpponents: () => set({ opponents: {} }),
  setScoreboard: (scoreboard) => set({ scoreboard }),
  setLastRoundEnded: (lastRoundEnded) => set({ lastRoundEnded }),
  setFinalLeaderboard: (finalLeaderboard) => set({ finalLeaderboard }),

  reset: () => set(initial),
}));
