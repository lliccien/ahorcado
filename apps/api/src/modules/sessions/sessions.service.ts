import { Injectable, Logger } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';

import {
  CODE_ALPHABET,
  CODE_LENGTH,
  DEFAULT_LOCALE,
  Player,
  SessionState,
  SessionStatus,
} from '@ahorcado/shared';

import { CreateSessionDto } from './dto/create-session.dto';
import { JoinSessionDto } from './dto/join-session.dto';
import {
  errInternal,
  errNameTaken,
  errSessionAlreadyStarted,
  errSessionFinished,
  errSessionNotFound,
} from './sessions.errors';
import { SessionsRepository } from './sessions.repository';

const MAX_CODE_ATTEMPTS = 10;

export interface CreatedSessionResult {
  state: SessionState;
  host: Player;
}

export interface JoinedSessionResult {
  state: SessionState;
  player: Player;
  players: Player[];
  resumed: boolean;
}

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(private readonly repo: SessionsRepository) {}

  async createSession(dto: CreateSessionDto): Promise<CreatedSessionResult> {
    const code = await this.generateUniqueCode();
    const sessionId = randomUUID();
    const hostId = randomUUID();
    const now = Date.now();

    const host: Player = {
      id: hostId,
      name: dto.hostName.trim(),
      isHost: true,
      connected: false,
      joinedAt: now,
    };

    const state: SessionState = {
      id: sessionId,
      code,
      status: SessionStatus.LOBBY,
      totalRounds: dto.totalRounds,
      currentRound: 0,
      categorySlug: dto.category,
      locale: DEFAULT_LOCALE,
      hostId,
      createdAt: now,
    };

    await this.repo.persistInitialSession(state, host);
    await this.repo.setSessionState(state);
    await this.repo.upsertPlayer(code, host);

    this.logger.log(`Sesión creada code=${code} host=${host.name}`);
    return { state, host };
  }

  async joinSession(dto: JoinSessionDto): Promise<JoinedSessionResult> {
    const state = await this.repo.getSessionState(dto.code);
    if (!state) throw errSessionNotFound(dto.code);
    if (state.status === SessionStatus.FINISHED) throw errSessionFinished();

    if (dto.resumePlayerId) {
      const existing = await this.repo.getPlayer(dto.code, dto.resumePlayerId);
      if (existing) {
        const updated: Player = { ...existing, connected: true };
        await this.repo.upsertPlayer(dto.code, updated);
        const players = await this.repo.listPlayers(dto.code);
        return { state, player: updated, players, resumed: true };
      }
    }

    const requestedName = dto.name.trim();
    const conflict = await this.repo.findPlayerByName(dto.code, requestedName);
    if (conflict) {
      // Si el conflicto es por reconexión sin resumePlayerId (mismo nombre,
      // probablemente la misma persona sin localStorage), permitimos retomar.
      if (!conflict.connected) {
        const reused: Player = { ...conflict, connected: true };
        await this.repo.upsertPlayer(dto.code, reused);
        const players = await this.repo.listPlayers(dto.code);
        return { state, player: reused, players, resumed: true };
      }
      throw errNameTaken(requestedName);
    }

    if (state.status !== SessionStatus.LOBBY) {
      // Solo se puede unir un nuevo jugador en lobby; si el juego ya empezó,
      // exigimos resumePlayerId válido (cubierto arriba).
      throw errSessionAlreadyStarted();
    }

    const player: Player = {
      id: randomUUID(),
      name: requestedName,
      isHost: false,
      connected: true,
      joinedAt: Date.now(),
    };
    await this.repo.persistJoinedPlayer(state.id, player);
    await this.repo.upsertPlayer(dto.code, player);

    const players = await this.repo.listPlayers(dto.code);
    this.logger.log(`Jugador unido code=${dto.code} name=${player.name}`);
    return { state, player, players, resumed: false };
  }

  async setPlayerConnected(
    code: string,
    playerId: string,
    connected: boolean,
  ): Promise<{
    state: SessionState;
    player: Player;
    players: Player[];
    hostChanged: { newHostId: string } | null;
  } | null> {
    const state = await this.repo.getSessionState(code);
    if (!state) return null;
    const player = await this.repo.setPlayerConnected(code, playerId, connected);
    if (!player) return null;
    let players = await this.repo.listPlayers(code);

    let hostChanged: { newHostId: string } | null = null;
    if (
      !connected &&
      playerId === state.hostId &&
      state.status !== SessionStatus.FINISHED
    ) {
      const nextHost = players.find((p) => p.connected && p.id !== playerId);
      if (nextHost) {
        await this.promoteHost(code, players, state, nextHost.id);
        hostChanged = { newHostId: nextHost.id };
        players = await this.repo.listPlayers(code);
      }
    }

    return { state, player, players, hostChanged };
  }

  private async promoteHost(
    code: string,
    players: Player[],
    state: SessionState,
    newHostId: string,
  ): Promise<void> {
    for (const p of players) {
      const shouldBeHost = p.id === newHostId;
      if (p.isHost === shouldBeHost) continue;
      await this.repo.upsertPlayer(code, { ...p, isHost: shouldBeHost });
    }
    await this.repo.setSessionState({ ...state, hostId: newHostId });
    this.logger.log(`Host transferido en code=${code} → ${newHostId}`);
  }

  async getSessionPublic(code: string): Promise<{
    exists: boolean;
    status?: SessionStatus;
    playersCount?: number;
    totalRounds?: number;
    category?: string;
  }> {
    const state = await this.repo.getSessionState(code);
    if (!state) return { exists: false };
    const players = await this.repo.listPlayers(code);
    return {
      exists: true,
      status: state.status,
      playersCount: players.length,
      totalRounds: state.totalRounds,
      category: state.categorySlug,
    };
  }

  async listPlayers(code: string): Promise<Player[]> {
    return this.repo.listPlayers(code);
  }

  async getState(code: string): Promise<SessionState | null> {
    return this.repo.getSessionState(code);
  }

  private async generateUniqueCode(): Promise<string> {
    for (let i = 0; i < MAX_CODE_ATTEMPTS; i++) {
      const candidate = this.randomCode();
      if (await this.repo.reserveCode(candidate)) return candidate;
    }
    throw errInternal('No se pudo generar un código de sesión único');
  }

  private randomCode(): string {
    const bytes = randomBytes(CODE_LENGTH);
    let out = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    }
    return out;
  }
}
