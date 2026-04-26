import type { ErrorCode } from './enums.js';
import type {
  GameFinishedPayload,
  HostChangedPayload,
  OpponentProgress,
  Player,
  PlayerKickedPayload,
  PlayerRoundState,
  RoundEndedPayload,
  RoundPublicState,
  ScoreboardEntry,
  SessionClosedPayload,
  SessionSnapshot,
  SessionState,
} from './types.js';

export interface CreateSessionPayload {
  totalRounds: number;
  category: string;
  hostName: string;
}

export interface CreateSessionAck {
  code: string;
  sessionId: string;
  hostPlayerId: string;
}

export interface JoinSessionPayload {
  code: string;
  name: string;
  resumePlayerId?: string;
}

export interface JoinSessionAck {
  playerId: string;
  session: SessionState;
  players: Player[];
}

export interface GuessLetterPayload {
  letter: string;
}

export interface KickPlayerPayload {
  playerId: string;
}

export interface GuessLetterResult {
  letter: string;
  hit: boolean;
  livesRemaining: number;
  maskedView: Array<string | null>;
  guessed: string[];
  solved: boolean;
}

export interface ErrorPayload {
  code: ErrorCode;
  message: string;
}

export interface RoundStartedPayload {
  round: RoundPublicState;
  myState: PlayerRoundState;
}

export interface PlayerJoinedPayload {
  player: Player;
  players: Player[];
}

export interface PlayerLeftPayload {
  playerId: string;
  players: Player[];
}

export interface PlayerReconnectedPayload {
  playerId: string;
  players: Player[];
}

export interface SessionStartedPayload {
  session: SessionState;
}

export interface ServerToClientEvents {
  'session:created': (payload: { code: string; session: SessionState }) => void;
  'session:started': (payload: SessionStartedPayload) => void;
  'session:closed': (payload: SessionClosedPayload) => void;
  'player:joined': (payload: PlayerJoinedPayload) => void;
  'player:left': (payload: PlayerLeftPayload) => void;
  'player:reconnected': (payload: PlayerReconnectedPayload) => void;
  'player:kicked': (payload: PlayerKickedPayload) => void;
  'host:changed': (payload: HostChangedPayload) => void;
  'round:started': (payload: RoundStartedPayload) => void;
  'round:guess:result': (payload: GuessLetterResult) => void;
  'round:opponentProgress': (payload: OpponentProgress) => void;
  'round:ended': (payload: RoundEndedPayload) => void;
  'game:finished': (payload: GameFinishedPayload) => void;
  'state:sync': (payload: SessionSnapshot) => void;
  'scoreboard:update': (payload: { scoreboard: ScoreboardEntry[] }) => void;
  error: (payload: ErrorPayload) => void;
}

export interface ClientToServerEvents {
  'session:create': (
    payload: CreateSessionPayload,
    ack: (response: CreateSessionAck | ErrorPayload) => void,
  ) => void;
  'session:join': (
    payload: JoinSessionPayload,
    ack: (response: JoinSessionAck | ErrorPayload) => void,
  ) => void;
  'session:start': (
    payload: Record<string, never>,
    ack?: (response: { ok: true } | ErrorPayload) => void,
  ) => void;
  'session:close': (
    payload: Record<string, never>,
    ack?: (response: { ok: true } | ErrorPayload) => void,
  ) => void;
  'session:kickPlayer': (
    payload: KickPlayerPayload,
    ack?: (response: { ok: true } | ErrorPayload) => void,
  ) => void;
  'host:nextRound': (
    payload: Record<string, never>,
    ack?: (response: { ok: true } | ErrorPayload) => void,
  ) => void;
  'round:guess': (
    payload: GuessLetterPayload,
    ack?: (response: GuessLetterResult | ErrorPayload) => void,
  ) => void;
  'state:resync': (
    payload: Record<string, never>,
    ack?: (response: SessionSnapshot | ErrorPayload) => void,
  ) => void;
  'session:leave': (payload: Record<string, never>) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  sessionCode: string;
  playerId: string;
  isHost: boolean;
}

export const WS_NAMESPACE = '/game';
