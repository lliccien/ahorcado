import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  Player,
  SessionState,
  SESSION_TTL_SECONDS,
} from '@ahorcado/shared';

import { RedisService } from '../redis/redis.service';
import { GameSessionEntity } from './entities/game-session.entity';
import { PlayerEntity } from './entities/player.entity';

const sessionKey = (code: string) => `session:${code}`;
const playersKey = (code: string) => `session:${code}:players`;
const playersOrderKey = (code: string) => `session:${code}:players:order`;
const codeReservedKey = (code: string) => `code:reserved:${code}`;

@Injectable()
export class SessionsRepository {
  constructor(
    private readonly redis: RedisService,
    @InjectRepository(GameSessionEntity)
    private readonly sessionRepo: Repository<GameSessionEntity>,
    @InjectRepository(PlayerEntity)
    private readonly playerRepo: Repository<PlayerEntity>,
  ) {}

  async reserveCode(code: string): Promise<boolean> {
    const result = await this.redis
      .getClient()
      .set(codeReservedKey(code), '1', 'EX', SESSION_TTL_SECONDS, 'NX');
    return result === 'OK';
  }

  async releaseCode(code: string): Promise<void> {
    await this.redis.del(codeReservedKey(code));
  }

  async persistInitialSession(
    state: SessionState,
    host: Player,
  ): Promise<void> {
    await this.sessionRepo.save(
      this.sessionRepo.create({
        id: state.id,
        code: state.code,
        hostPlayerId: state.hostId,
        categorySlug: state.categorySlug,
        locale: state.locale,
        totalRounds: state.totalRounds,
        currentRound: state.currentRound,
        status: state.status,
        winnerPlayerId: null,
      }),
    );
    await this.playerRepo.save(
      this.playerRepo.create({
        id: host.id,
        sessionId: state.id,
        name: host.name,
        isHost: true,
      }),
    );
  }

  async persistJoinedPlayer(sessionId: string, player: Player): Promise<void> {
    await this.playerRepo.save(
      this.playerRepo.create({
        id: player.id,
        sessionId,
        name: player.name,
        isHost: player.isHost,
      }),
    );
  }

  async setSessionState(state: SessionState): Promise<void> {
    await this.redis.setJson(
      sessionKey(state.code),
      state,
      SESSION_TTL_SECONDS,
    );
  }

  async getSessionState(code: string): Promise<SessionState | null> {
    return this.redis.getJson<SessionState>(sessionKey(code));
  }

  async upsertPlayer(code: string, player: Player): Promise<void> {
    const client = this.redis.getClient();
    const exists = await client.hexists(playersKey(code), player.id);
    await client.hset(
      playersKey(code),
      player.id,
      JSON.stringify(player),
    );
    if (!exists) {
      await client.rpush(playersOrderKey(code), player.id);
    }
    await client.expire(playersKey(code), SESSION_TTL_SECONDS);
    await client.expire(playersOrderKey(code), SESSION_TTL_SECONDS);
  }

  async getPlayer(code: string, playerId: string): Promise<Player | null> {
    const raw = await this.redis
      .getClient()
      .hget(playersKey(code), playerId);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Player;
    } catch {
      return null;
    }
  }

  async listPlayers(code: string): Promise<Player[]> {
    const client = this.redis.getClient();
    const order = await client.lrange(playersOrderKey(code), 0, -1);
    if (order.length === 0) return [];
    const raws = await client.hmget(playersKey(code), ...order);
    const players: Player[] = [];
    for (const raw of raws) {
      if (!raw) continue;
      try {
        players.push(JSON.parse(raw) as Player);
      } catch {
        // ignora entradas corruptas
      }
    }
    return players;
  }

  async findPlayerByName(
    code: string,
    name: string,
  ): Promise<Player | null> {
    const players = await this.listPlayers(code);
    const normalized = name.trim().toLowerCase();
    return (
      players.find((p) => p.name.trim().toLowerCase() === normalized) ?? null
    );
  }

  async setPlayerConnected(
    code: string,
    playerId: string,
    connected: boolean,
  ): Promise<Player | null> {
    const player = await this.getPlayer(code, playerId);
    if (!player) return null;
    const updated: Player = { ...player, connected };
    await this.upsertPlayer(code, updated);
    return updated;
  }

  async sessionExists(code: string): Promise<boolean> {
    const state = await this.getSessionState(code);
    return state !== null;
  }
}
