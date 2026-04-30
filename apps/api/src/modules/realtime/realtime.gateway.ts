import { Logger, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';

import {
  ErrorCode,
  ROUND_END_DELAY_MS,
  WS_NAMESPACE,
  type CreateSessionAck,
  type ErrorPayload,
  type JoinSessionAck,
  type SessionSnapshot,
  type SocketData,
} from '@ahorcado/shared';

import { GameService } from '../game/game.service';
import { GuessLetterDto } from '../game/dto/guess-letter.dto';
import { CreateSessionDto } from '../sessions/dto/create-session.dto';
import { JoinSessionDto } from '../sessions/dto/join-session.dto';
import { KickPlayerDto } from '../sessions/dto/kick-player.dto';
import { SessionsService } from '../sessions/sessions.service';
import { WsExceptionFilter } from './ws-exception.filter';

const roomName = (code: string) => `session:${code}`;

@WebSocketGateway({
  namespace: WS_NAMESPACE,
  cors: { origin: true, credentials: true },
})
@UseFilters(WsExceptionFilter)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly filter = new WsExceptionFilter();

  /**
   * Timers de auto-advance entre rondas. Mientras corre uno, está activo el
   * countdown de 5s que avanza la sesión sin esperar al host. Si el host
   * pulsa "Siguiente ronda" antes del timeout, se cancela aquí.
   */
  private readonly autoAdvanceTimers = new Map<string, NodeJS.Timeout>();

  /** Cuando se declara `namespace`, server ya es Namespace, no Server raíz. */
  @WebSocketServer()
  server!: Namespace;

  constructor(
    private readonly sessions: SessionsService,
    private readonly game: GameService,
  ) {}

  afterInit(): void {
    this.logger.log(`Gateway listo en namespace ${WS_NAMESPACE}`);
  }

  handleConnection(client: Socket): void {
    this.logger.debug(`Cliente conectado: ${client.id}`);
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const data = client.data as Partial<SocketData>;
    if (data?.sessionCode && data.playerId) {
      const result = await this.sessions.setPlayerConnected(
        data.sessionCode,
        data.playerId,
        false,
      );
      if (result) {
        this.server.to(roomName(data.sessionCode)).emit('player:left', {
          playerId: data.playerId,
          players: result.players,
        });
        if (result.hostChanged) {
          this.server.to(roomName(data.sessionCode)).emit('host:changed', {
            hostId: result.hostChanged.newHostId,
            players: result.players,
          });
        }
      }
    }
    this.logger.debug(`Cliente desconectado: ${client.id}`);
  }

  // ---------------------------------------------------------------------
  // Lobby
  // ---------------------------------------------------------------------
  @SubscribeMessage('session:create')
  async handleCreateSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: CreateSessionDto,
  ): Promise<CreateSessionAck | ErrorPayload> {
    try {
      const { state, host } = await this.sessions.createSession(dto);
      const updated = await this.sessions.setPlayerConnected(
        state.code,
        host.id,
        true,
      );
      const players = updated?.players ?? [host];
      const data: SocketData = {
        sessionCode: state.code,
        playerId: host.id,
        isHost: true,
      };
      client.data = data;
      await client.join(roomName(state.code));

      this.server
        .to(roomName(state.code))
        .emit('session:created', { code: state.code, session: state });

      this.server.to(roomName(state.code)).emit('player:joined', {
        player: players.find((p) => p.id === host.id) ?? host,
        players,
      });

      return {
        code: state.code,
        sessionId: state.id,
        hostPlayerId: host.id,
      };
    } catch (err) {
      return this.filter.toErrorPayload(err);
    }
  }

  @SubscribeMessage('session:join')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinSessionDto,
  ): Promise<JoinSessionAck | ErrorPayload> {
    try {
      const result = await this.sessions.joinSession(dto);
      const data: SocketData = {
        sessionCode: result.state.code,
        playerId: result.player.id,
        isHost: result.player.isHost,
      };
      client.data = data;
      await client.join(roomName(result.state.code));

      const eventName = result.resumed ? 'player:reconnected' : 'player:joined';
      this.server.to(roomName(result.state.code)).emit(eventName, {
        player: result.player,
        playerId: result.player.id,
        players: result.players,
      });

      return {
        playerId: result.player.id,
        session: result.state,
        players: result.players,
      };
    } catch (err) {
      return this.filter.toErrorPayload(err);
    }
  }

  @SubscribeMessage('session:leave')
  async handleLeave(@ConnectedSocket() client: Socket): Promise<void> {
    const data = client.data as Partial<SocketData>;
    if (data?.sessionCode && data.playerId) {
      const result = await this.sessions.setPlayerConnected(
        data.sessionCode,
        data.playerId,
        false,
      );
      if (result) {
        this.server.to(roomName(data.sessionCode)).emit('player:left', {
          playerId: data.playerId,
          players: result.players,
        });
        if (result.hostChanged) {
          this.server.to(roomName(data.sessionCode)).emit('host:changed', {
            hostId: result.hostChanged.newHostId,
            players: result.players,
          });
        }
      }
      await client.leave(roomName(data.sessionCode));
    }
  }

  @SubscribeMessage('state:resync')
  async handleResync(
    @ConnectedSocket() client: Socket,
  ): Promise<SessionSnapshot | ErrorPayload> {
    try {
      const data = client.data as Partial<SocketData>;
      if (!data?.sessionCode || !data.playerId) {
        return {
          code: ErrorCode.SESSION_NOT_FOUND,
          message: 'Socket sin sesión asociada',
        };
      }
      const snapshot = await this.game.buildSnapshot(
        data.sessionCode,
        data.playerId,
      );
      if (!snapshot) {
        return {
          code: ErrorCode.SESSION_NOT_FOUND,
          message: 'No encontramos la sala',
        };
      }
      return snapshot;
    } catch (err) {
      return this.filter.toErrorPayload(err);
    }
  }

  // ---------------------------------------------------------------------
  // Gameplay
  // ---------------------------------------------------------------------
  @SubscribeMessage('session:start')
  async handleStart(
    @ConnectedSocket() client: Socket,
  ): Promise<{ ok: true } | ErrorPayload> {
    try {
      const data = client.data as Partial<SocketData>;
      if (!data?.sessionCode || !data.playerId) {
        return {
          code: ErrorCode.SESSION_NOT_FOUND,
          message: 'Socket sin sesión asociada',
        };
      }
      const start = await this.game.startSession(
        data.sessionCode,
        data.playerId,
      );
      this.server
        .to(roomName(data.sessionCode))
        .emit('session:started', { session: start.state });
      // Cada jugador recibe round:started con SU estado individual
      for (const [pid, myState] of start.perPlayer.entries()) {
        const sockets = await this.server
          .in(roomName(data.sessionCode))
          .fetchSockets();
        for (const s of sockets) {
          const sd = s.data as Partial<SocketData> | undefined;
          if (sd?.playerId === pid) {
            s.emit('round:started', { round: start.roundPublic, myState });
          }
        }
      }
      return { ok: true };
    } catch (err) {
      return this.filter.toErrorPayload(err);
    }
  }

  @SubscribeMessage('session:close')
  async handleCloseSession(
    @ConnectedSocket() client: Socket,
  ): Promise<{ ok: true } | ErrorPayload> {
    try {
      const data = client.data as Partial<SocketData>;
      if (!data?.sessionCode || !data.playerId) {
        return {
          code: ErrorCode.SESSION_NOT_FOUND,
          message: 'Socket sin sesión asociada',
        };
      }
      const { state } = await this.sessions.closeSession(
        data.sessionCode,
        data.playerId,
      );
      this.cancelAutoAdvance(data.sessionCode);
      // Avisamos a todos los sockets en la sala antes de borrarla
      this.server.to(roomName(data.sessionCode)).emit('session:closed', {
        sessionCode: state.code,
        reason: 'El host cerró la sala',
      });
      // Sacamos a los sockets del room
      const sockets = await this.server
        .in(roomName(data.sessionCode))
        .fetchSockets();
      for (const s of sockets) {
        await s.leave(roomName(data.sessionCode));
      }
      return { ok: true };
    } catch (err) {
      return this.filter.toErrorPayload(err);
    }
  }

  @SubscribeMessage('session:kickPlayer')
  async handleKickPlayer(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: KickPlayerDto,
  ): Promise<{ ok: true } | ErrorPayload> {
    try {
      const data = client.data as Partial<SocketData>;
      if (!data?.sessionCode || !data.playerId) {
        return {
          code: ErrorCode.SESSION_NOT_FOUND,
          message: 'Socket sin sesión asociada',
        };
      }
      const { players, targetId } = await this.sessions.kickPlayer(
        data.sessionCode,
        data.playerId,
        dto.playerId,
      );
      // Notificar a todos en la sala (incluye al expulsado, que recibe esto y se desconecta de la room)
      this.server.to(roomName(data.sessionCode)).emit('player:kicked', {
        playerId: targetId,
        players,
      });
      // Sacar al socket expulsado de la room (si está conectado)
      const sockets = await this.server
        .in(roomName(data.sessionCode))
        .fetchSockets();
      for (const s of sockets) {
        const sd = s.data as Partial<SocketData> | undefined;
        if (sd?.playerId === targetId) {
          await s.leave(roomName(data.sessionCode));
          (s.data as Partial<SocketData>).sessionCode = undefined;
        }
      }
      return { ok: true };
    } catch (err) {
      return this.filter.toErrorPayload(err);
    }
  }

  @SubscribeMessage('host:nextRound')
  async handleNextRound(
    @ConnectedSocket() client: Socket,
  ): Promise<{ ok: true } | ErrorPayload> {
    try {
      const data = client.data as Partial<SocketData>;
      if (!data?.sessionCode || !data.playerId) {
        return {
          code: ErrorCode.SESSION_NOT_FOUND,
          message: 'Socket sin sesión asociada',
        };
      }
      this.cancelAutoAdvance(data.sessionCode);
      await this.triggerAdvance(data.sessionCode, data.playerId);
      return { ok: true };
    } catch (err) {
      return this.filter.toErrorPayload(err);
    }
  }

  private async triggerAdvance(
    code: string,
    requesterId?: string,
  ): Promise<void> {
    const advance = await this.game.advanceRound(code, requesterId);
    if (advance.kind === 'finished') {
      this.server.to(roomName(code)).emit('game:finished', advance.payload);
      return;
    }
    const start = advance.result;
    this.server
      .to(roomName(code))
      .emit('session:started', { session: start.state });
    const sockets = await this.server.in(roomName(code)).fetchSockets();
    for (const s of sockets) {
      const sd = s.data as Partial<SocketData> | undefined;
      if (!sd?.playerId) continue;
      const myState = start.perPlayer.get(sd.playerId);
      if (myState) {
        s.emit('round:started', { round: start.roundPublic, myState });
      }
    }
  }

  private scheduleAutoAdvance(code: string, isFinalRound: boolean): void {
    this.cancelAutoAdvance(code);
    const handle = setTimeout(() => {
      this.autoAdvanceTimers.delete(code);
      this.triggerAdvance(code).catch((err) => {
        this.logger.warn(
          `Auto-advance code=${code} falló: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    }, ROUND_END_DELAY_MS);
    // Permitir que el proceso termine si solo queda este timer
    if (typeof handle.unref === 'function') handle.unref();
    this.autoAdvanceTimers.set(code, handle);
    this.logger.debug(
      `Auto-advance programado code=${code} en ${ROUND_END_DELAY_MS}ms (final=${isFinalRound})`,
    );
  }

  private cancelAutoAdvance(code: string): void {
    const handle = this.autoAdvanceTimers.get(code);
    if (handle) {
      clearTimeout(handle);
      this.autoAdvanceTimers.delete(code);
    }
  }

  @SubscribeMessage('round:guess')
  async handleGuess(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: GuessLetterDto,
  ) {
    try {
      const data = client.data as Partial<SocketData>;
      if (!data?.sessionCode || !data.playerId) {
        return {
          code: ErrorCode.SESSION_NOT_FOUND,
          message: 'Socket sin sesión asociada',
        };
      }
      const outcome = await this.game.applyGuess(
        data.sessionCode,
        data.playerId,
        dto.letter,
      );

      // Difundir progreso opaco a la sala (sin letras concretas)
      this.server
        .to(roomName(data.sessionCode))
        .emit('round:opponentProgress', outcome.opponentProgress);

      if (outcome.roundEnded && outcome.endedPayload) {
        this.server
          .to(roomName(data.sessionCode))
          .emit('round:ended', outcome.endedPayload);
        this.scheduleAutoAdvance(
          data.sessionCode,
          outcome.endedPayload.isFinalRound,
        );
      }

      return outcome.result;
    } catch (err) {
      return this.filter.toErrorPayload(err);
    }
  }
}
