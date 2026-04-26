export enum SessionStatus {
  LOBBY = 'LOBBY',
  IN_PROGRESS = 'IN_PROGRESS',
  ROUND_ENDED = 'ROUND_ENDED',
  FINISHED = 'FINISHED',
  ABANDONED = 'ABANDONED',
}

export enum WordDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export enum ErrorCode {
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_FULL = 'SESSION_FULL',
  SESSION_ALREADY_STARTED = 'SESSION_ALREADY_STARTED',
  SESSION_FINISHED = 'SESSION_FINISHED',
  NAME_TAKEN = 'NAME_TAKEN',
  NOT_HOST = 'NOT_HOST',
  INVALID_LETTER = 'INVALID_LETTER',
  ALREADY_GUESSED = 'ALREADY_GUESSED',
  ROUND_NOT_ACTIVE = 'ROUND_NOT_ACTIVE',
  PLAYER_NOT_FOUND = 'PLAYER_NOT_FOUND',
  NOT_ENOUGH_PLAYERS = 'NOT_ENOUGH_PLAYERS',
  RATE_LIMITED = 'RATE_LIMITED',
  CANNOT_CLOSE_WITH_PLAYERS = 'CANNOT_CLOSE_WITH_PLAYERS',
  CANNOT_KICK_HOST = 'CANNOT_KICK_HOST',
  KICK_IN_PROGRESS = 'KICK_IN_PROGRESS',
  CLOSE_IN_PROGRESS = 'CLOSE_IN_PROGRESS',
  INTERNAL = 'INTERNAL',
}

export const CATEGORY_SLUGS = [
  'animales',
  'paises',
  'frutas-verduras',
  'comida-latam',
  'peliculas',
  'deportes',
  'profesiones',
  'objetos-hogar',
  'naturaleza',
  'musica',
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];
