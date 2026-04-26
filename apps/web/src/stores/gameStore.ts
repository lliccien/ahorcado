import { create } from 'zustand';

import type {
  ErrorPayload,
  Player,
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

  setConnectionStatus: (status: ConnectionStatus) => void;
  setSession: (session: SessionState | null) => void;
  setPlayers: (players: Player[]) => void;
  setMyPlayerId: (id: string | null) => void;
  setError: (error: ErrorPayload | null) => void;
  reset: () => void;
}

const initial = {
  connectionStatus: 'idle' as ConnectionStatus,
  session: null,
  players: [] as Player[],
  myPlayerId: null,
  error: null,
};

export const useGameStore = create<GameStoreState>((set) => ({
  ...initial,
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setSession: (session) => set({ session }),
  setPlayers: (players) => set({ players }),
  setMyPlayerId: (myPlayerId) => set({ myPlayerId }),
  setError: (error) => set({ error }),
  reset: () => set(initial),
}));
