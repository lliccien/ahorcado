import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  GUESS_LOCK_TTL_MS,
  LIVES_PER_ROUND,
  MIN_PLAYERS_TO_START,
  type GameFinishedPayload,
  type GuessLetterResult,
  type OpponentProgress,
  type Player,
  type PlayerRoundState,
  type RoundEndedPayload,
  type RoundPlayerSummary,
  type RoundPublicState,
  type RoundStartedPayload,
  type ScoreboardEntry,
  type SessionSnapshot,
  type SessionState,
  SESSION_TTL_SECONDS,
  SessionStatus,
} from '@ahorcado/shared';

import { RedisService } from '../redis/redis.service';
import { SessionsRepository } from '../sessions/sessions.repository';
import {
  errNotHost,
  errPlayerNotFound,
  errSessionAlreadyStarted,
  errSessionFinished,
  errSessionNotFound,
} from '../sessions/sessions.errors';
import { WordsService } from '../words/words.service';
import {
  applyLetterToMask,
  buildInitialMask,
  countRevealed,
  defaultLives,
  isFullyRevealed,
  letterSlotCount,
} from './game.utils';
import {
  errAlreadyGuessed,
  errNotEnoughPlayers,
  errRoundNotActive,
} from './game.errors';

const sessionKey = (code: string) => `session:${code}`;
const roundKey = (code: string, n: number) => `round:${code}:${n}`;
const roundSecretKey = (code: string, n: number) =>
  `round:${code}:${n}:secret`;
const playerRoundKey = (code: string, n: number, playerId: string) =>
  `round:${code}:${n}:player:${playerId}`;
const roundResolvedKey = (code: string, n: number) =>
  `round:${code}:${n}:resolved`;
const scoreboardKey = (code: string) => `session:${code}:scoreboard`;
const playerGuessLockKey = (code: string, playerId: string) =>
  `session:${code}:lock:guess:${playerId}`;
const lastRoundEndedKey = (code: string) => `session:${code}:lastRoundEnded`;

interface RoundStateInternal {
  roundNumber: number;
  wordId: string;
  wordLength: number;
  categorySlug: string;
  categoryName: string;
  startedAt: number;
  endedAt: number | null;
  winnerId: string | null;
  livesPerPlayer: number;
  /** Plantilla de máscara con espacios pre-rellenados; se serializa como string compacto */
  maskTemplate: Array<string | null>;
}

export interface StartRoundResult {
  state: SessionState;
  roundPublic: RoundPublicState;
  perPlayer: Map<string, PlayerRoundState>;
}

export interface GuessOutcome {
  result: GuessLetterResult;
  roundEnded: boolean;
  endedPayload: RoundEndedPayload | null;
  opponentProgress: OpponentProgress;
}

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly sessions: SessionsRepository,
    private readonly words: WordsService,
  ) {}

  // ------------------------------------------------------------------
  // Iniciar partida (LOBBY → IN_PROGRESS) y primera ronda
  // ------------------------------------------------------------------
  async startSession(
    code: string,
    requesterId: string,
  ): Promise<StartRoundResult> {
    const state = await this.sessions.getSessionState(code);
    if (!state) throw errSessionNotFound(code);
    if (state.status === SessionStatus.FINISHED) throw errSessionFinished();
    if (state.hostId !== requesterId) throw errNotHost();
    if (state.status !== SessionStatus.LOBBY) throw errSessionAlreadyStarted();

    const players = await this.sessions.listPlayers(code);
    const connectedCount = players.filter((p) => p.connected).length;
    if (
      players.length < MIN_PLAYERS_TO_START ||
      connectedCount < MIN_PLAYERS_TO_START
    ) {
      throw errNotEnoughPlayers();
    }

    const newState: SessionState = {
      ...state,
      status: SessionStatus.IN_PROGRESS,
      currentRound: 1,
    };
    await this.sessions.setSessionState(newState);
    return this.startRound(newState, players);
  }

  // ------------------------------------------------------------------
  // Inicia una ronda nueva: pide palabra, crea estados por jugador
  // ------------------------------------------------------------------
  async startRound(
    sessionState: SessionState,
    players: Player[],
  ): Promise<StartRoundResult> {
    const word = await this.words.pickWord(
      sessionState.code,
      sessionState.categorySlug,
      sessionState.locale,
    );

    const round: RoundStateInternal = {
      roundNumber: sessionState.currentRound,
      wordId: word.id,
      wordLength: word.text.length,
      categorySlug: word.categorySlug,
      categoryName: word.categoryName,
      startedAt: Date.now(),
      endedAt: null,
      winnerId: null,
      livesPerPlayer: LIVES_PER_ROUND,
      maskTemplate: buildInitialMask(word.text),
    };

    await Promise.all([
      this.redis.setJson(
        roundKey(sessionState.code, round.roundNumber),
        round,
        SESSION_TTL_SECONDS,
      ),
      this.redis
        .getClient()
        .set(
          roundSecretKey(sessionState.code, round.roundNumber),
          word.text,
          'EX',
          SESSION_TTL_SECONDS,
        ),
      this.redis.del(lastRoundEndedKey(sessionState.code)),
    ]);

    const perPlayer = new Map<string, PlayerRoundState>();
    for (const player of players) {
      const ps: PlayerRoundState = {
        playerId: player.id,
        livesRemaining: defaultLives(),
        guessed: [],
        maskedView: round.maskTemplate.slice(),
        revealedCount: 0,
        solved: false,
        solvedAtMs: null,
      };
      await this.redis.setJson(
        playerRoundKey(sessionState.code, round.roundNumber, player.id),
        ps,
        SESSION_TTL_SECONDS,
      );
      perPlayer.set(player.id, ps);
    }

    const roundPublic: RoundPublicState = {
      roundNumber: round.roundNumber,
      categoryName: round.categoryName,
      maskedLength: round.maskTemplate.length,
      startedAt: round.startedAt,
      endedAt: null,
      winnerId: null,
      livesPerPlayer: round.livesPerPlayer,
    };

    return { state: sessionState, roundPublic, perPlayer };
  }

  buildRoundStartedPayload(
    roundPublic: RoundPublicState,
    myState: PlayerRoundState,
  ): RoundStartedPayload {
    return { round: roundPublic, myState };
  }

  // ------------------------------------------------------------------
  // Procesar intento de letra
  // ------------------------------------------------------------------
  async applyGuess(
    code: string,
    playerId: string,
    letter: string,
  ): Promise<GuessOutcome> {
    const state = await this.sessions.getSessionState(code);
    if (!state) throw errSessionNotFound(code);
    if (state.status !== SessionStatus.IN_PROGRESS) {
      throw errRoundNotActive();
    }
    const player = await this.sessions.getPlayer(code, playerId);
    if (!player) throw errPlayerNotFound();

    // Lock corto por jugador para evitar double-fire del mismo guess.
    const lockKey = playerGuessLockKey(code, playerId);
    const token = randomUUID();
    const got = await this.redis.tryAcquireLock(
      lockKey,
      GUESS_LOCK_TTL_MS,
      token,
    );
    if (!got) {
      // Si llega muy seguido, mejor simplemente ignorar; el cliente reintenta.
      throw errRoundNotActive();
    }
    try {
      return await this.processGuess(state, player, letter);
    } finally {
      await this.redis.releaseLock(lockKey, token);
    }
  }

  private async processGuess(
    state: SessionState,
    player: Player,
    letter: string,
  ): Promise<GuessOutcome> {
    const n = state.currentRound;
    const round = await this.redis.getJson<RoundStateInternal>(
      roundKey(state.code, n),
    );
    if (!round || round.endedAt) throw errRoundNotActive();

    const myState = await this.redis.getJson<PlayerRoundState>(
      playerRoundKey(state.code, n, player.id),
    );
    if (!myState) throw errRoundNotActive();
    if (myState.solved || myState.livesRemaining <= 0) {
      // Ya no puede jugar; devolvemos el estado actual sin tocar nada.
      const result: GuessLetterResult = {
        letter,
        hit: false,
        livesRemaining: myState.livesRemaining,
        maskedView: myState.maskedView,
        guessed: myState.guessed,
        solved: myState.solved,
      };
      const opponentProgress: OpponentProgress = {
        playerId: player.id,
        livesRemaining: myState.livesRemaining,
        revealedCount: myState.revealedCount,
        solved: myState.solved,
      };
      return {
        result,
        opponentProgress,
        roundEnded: false,
        endedPayload: null,
      };
    }

    if (myState.guessed.includes(letter)) {
      throw errAlreadyGuessed(letter);
    }

    const secret = await this.redis
      .getClient()
      .get(roundSecretKey(state.code, n));
    if (!secret) throw errRoundNotActive();

    const { hit, updated } = applyLetterToMask(
      secret,
      myState.maskedView,
      letter,
    );

    const nextState: PlayerRoundState = {
      ...myState,
      guessed: [...myState.guessed, letter],
      livesRemaining: hit ? myState.livesRemaining : myState.livesRemaining - 1,
      maskedView: updated,
      revealedCount: countRevealed(updated),
      solved: false,
      solvedAtMs: null,
    };
    if (hit && isFullyRevealed(updated)) {
      nextState.solved = true;
      nextState.solvedAtMs = Date.now();
    }

    await this.redis.setJson(
      playerRoundKey(state.code, n, player.id),
      nextState,
      SESSION_TTL_SECONDS,
    );

    const result: GuessLetterResult = {
      letter,
      hit,
      livesRemaining: nextState.livesRemaining,
      maskedView: nextState.maskedView,
      guessed: nextState.guessed,
      solved: nextState.solved,
    };
    const opponentProgress: OpponentProgress = {
      playerId: player.id,
      livesRemaining: nextState.livesRemaining,
      revealedCount: nextState.revealedCount,
      solved: nextState.solved,
    };

    let endedPayload: RoundEndedPayload | null = null;

    if (nextState.solved) {
      endedPayload = await this.tryFinalizeRoundBecauseWin(
        state,
        round,
        player.id,
      );
    } else if (nextState.livesRemaining === 0) {
      endedPayload = await this.maybeFinalizeRoundIfAllOut(state, round);
    }

    return {
      result,
      opponentProgress,
      roundEnded: endedPayload !== null,
      endedPayload,
    };
  }

  private async tryFinalizeRoundBecauseWin(
    state: SessionState,
    round: RoundStateInternal,
    winnerId: string,
  ): Promise<RoundEndedPayload | null> {
    const lockToken = randomUUID();
    const acquired = await this.redis.tryAcquireLock(
      roundResolvedKey(state.code, round.roundNumber),
      SESSION_TTL_SECONDS * 1000,
      lockToken,
    );
    if (!acquired) {
      // Otro jugador ganó primero; nos limitamos a marcar este como resuelto en su tablero.
      return null;
    }
    return this.finalizeRound(state, round, winnerId);
  }

  private async maybeFinalizeRoundIfAllOut(
    state: SessionState,
    round: RoundStateInternal,
  ): Promise<RoundEndedPayload | null> {
    const players = await this.sessions.listPlayers(state.code);
    let allOut = true;
    for (const p of players) {
      const ps = await this.redis.getJson<PlayerRoundState>(
        playerRoundKey(state.code, round.roundNumber, p.id),
      );
      if (!ps) continue;
      if (ps.solved) {
        // Algún jugador ya ganó por otro camino; lo deja a tryFinalizeRoundBecauseWin
        return null;
      }
      if (ps.livesRemaining > 0) {
        allOut = false;
        break;
      }
    }
    if (!allOut) return null;
    const lockToken = randomUUID();
    const acquired = await this.redis.tryAcquireLock(
      roundResolvedKey(state.code, round.roundNumber),
      SESSION_TTL_SECONDS * 1000,
      lockToken,
    );
    if (!acquired) return null;
    return this.finalizeRound(state, round, null);
  }

  private async finalizeRound(
    state: SessionState,
    round: RoundStateInternal,
    winnerId: string | null,
  ): Promise<RoundEndedPayload> {
    const players = await this.sessions.listPlayers(state.code);
    const perPlayer: RoundPlayerSummary[] = [];
    for (const p of players) {
      const ps = await this.redis.getJson<PlayerRoundState>(
        playerRoundKey(state.code, round.roundNumber, p.id),
      );
      perPlayer.push({
        playerId: p.id,
        name: p.name,
        livesRemaining: ps?.livesRemaining ?? 0,
        solved: ps?.solved ?? false,
        solvedAtMs: ps?.solvedAtMs ?? null,
      });
    }

    if (winnerId) {
      await this.redis
        .getClient()
        .hincrby(scoreboardKey(state.code), winnerId, 1);
      await this.redis
        .getClient()
        .expire(scoreboardKey(state.code), SESSION_TTL_SECONDS);
    }

    const updatedRound: RoundStateInternal = {
      ...round,
      endedAt: Date.now(),
      winnerId,
    };
    await this.redis.setJson(
      roundKey(state.code, round.roundNumber),
      updatedRound,
      SESSION_TTL_SECONDS,
    );

    const newState: SessionState = {
      ...state,
      status: SessionStatus.ROUND_ENDED,
    };
    await this.sessions.setSessionState(newState);

    const isFinalRound = round.roundNumber >= state.totalRounds;

    const secret = await this.redis
      .getClient()
      .get(roundSecretKey(state.code, round.roundNumber));

    const scoreboard = await this.getScoreboard(state.code, players);

    const payload: RoundEndedPayload = {
      roundNumber: round.roundNumber,
      winnerId,
      word: secret ?? '',
      perPlayer,
      scoreboard,
      isFinalRound,
    };
    await this.redis.setJson(
      lastRoundEndedKey(state.code),
      payload,
      SESSION_TTL_SECONDS,
    );
    return payload;
  }

  // ------------------------------------------------------------------
  // Avanzar a la siguiente ronda o cerrar la sesión
  // ------------------------------------------------------------------
  async advanceRound(
    code: string,
    requesterId?: string,
  ): Promise<
    | { kind: 'round'; result: StartRoundResult }
    | { kind: 'finished'; payload: GameFinishedPayload }
  > {
    const state = await this.sessions.getSessionState(code);
    if (!state) throw errSessionNotFound(code);
    if (state.status === SessionStatus.FINISHED) throw errSessionFinished();
    if (state.status !== SessionStatus.ROUND_ENDED) throw errRoundNotActive();
    if (requesterId && requesterId !== state.hostId) throw errNotHost();

    if (state.currentRound >= state.totalRounds) {
      return { kind: 'finished', payload: await this.finishSession(state) };
    }

    const next: SessionState = {
      ...state,
      currentRound: state.currentRound + 1,
      status: SessionStatus.IN_PROGRESS,
    };
    await this.sessions.setSessionState(next);

    const players = await this.sessions.listPlayers(code);
    const result = await this.startRound(next, players);
    return { kind: 'round', result };
  }

  private async finishSession(
    state: SessionState,
  ): Promise<GameFinishedPayload> {
    const finalState: SessionState = {
      ...state,
      status: SessionStatus.FINISHED,
    };
    await this.sessions.setSessionState(finalState);

    const players = await this.sessions.listPlayers(state.code);
    const leaderboard = await this.getScoreboard(state.code, players);
    return {
      sessionCode: state.code,
      leaderboard,
      totalRounds: state.totalRounds,
    };
  }

  // ------------------------------------------------------------------
  // Lecturas auxiliares
  // ------------------------------------------------------------------
  async getScoreboard(
    code: string,
    players: Player[],
  ): Promise<ScoreboardEntry[]> {
    const raw = await this.redis.getClient().hgetall(scoreboardKey(code));
    return players.map((p) => ({
      playerId: p.id,
      name: p.name,
      wins: raw[p.id] ? parseInt(raw[p.id], 10) || 0 : 0,
    }));
  }

  async getMyRoundState(
    code: string,
    roundNumber: number,
    playerId: string,
  ): Promise<PlayerRoundState | null> {
    return this.redis.getJson<PlayerRoundState>(
      playerRoundKey(code, roundNumber, playerId),
    );
  }

  async getRoundPublic(
    code: string,
    roundNumber: number,
  ): Promise<RoundPublicState | null> {
    const round = await this.redis.getJson<RoundStateInternal>(
      roundKey(code, roundNumber),
    );
    if (!round) return null;
    return {
      roundNumber: round.roundNumber,
      categoryName: round.categoryName,
      maskedLength: round.wordLength,
      startedAt: round.startedAt,
      endedAt: round.endedAt,
      winnerId: round.winnerId,
      livesPerPlayer: round.livesPerPlayer,
    };
  }

  /**
   * Snapshot completo de la sesión para el jugador dado, listo para hidratar
   * la UI tras una recarga o reconexión.
   */
  async buildSnapshot(
    code: string,
    playerId: string,
  ): Promise<SessionSnapshot | null> {
    const state = await this.sessions.getSessionState(code);
    if (!state) return null;
    const players = await this.sessions.listPlayers(code);

    const inActiveRound =
      state.status === SessionStatus.IN_PROGRESS ||
      state.status === SessionStatus.ROUND_ENDED;

    const currentRound = inActiveRound
      ? await this.getRoundPublic(code, state.currentRound)
      : null;

    const myState = inActiveRound
      ? await this.getMyRoundState(code, state.currentRound, playerId)
      : null;

    const opponents: OpponentProgress[] = [];
    if (inActiveRound) {
      for (const p of players) {
        if (p.id === playerId) continue;
        const ps = await this.getMyRoundState(code, state.currentRound, p.id);
        if (!ps) continue;
        opponents.push({
          playerId: p.id,
          livesRemaining: ps.livesRemaining,
          revealedCount: ps.revealedCount,
          solved: ps.solved,
        });
      }
    }

    const scoreboard = await this.getScoreboard(code, players);
    const lastRoundEnded = await this.redis.getJson<RoundEndedPayload>(
      lastRoundEndedKey(code),
    );

    return {
      session: state,
      players,
      currentRound,
      myState,
      opponents,
      scoreboard,
      lastRoundEnded,
    };
  }

  // Eslint complacence: importamos varias utilidades para que el linter no las quite.
  // Estas funciones se usan en pruebas o en futuras fases.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _unusedExports = letterSlotCount;
}
