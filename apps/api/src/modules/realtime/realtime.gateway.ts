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
  WS_NAMESPACE,
  type CreateSessionAck,
  type ErrorPayload,
  type JoinSessionAck,
  type Player,
  type SessionState,
  type SocketData,
} from '@ahorcado/shared';

import { CreateSessionDto } from '../sessions/dto/create-session.dto';
import { JoinSessionDto } from '../sessions/dto/join-session.dto';
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
   * Cuando el gateway declara `namespace`, `server` ya es el Namespace, no el
   * Socket.io Server raíz. Por eso emitimos directo con `this.server.to(...)`.
   */
  @WebSocketServer()
  server!: Namespace;

  constructor(private readonly sessions: SessionsService) {}

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
      }
    }
    this.logger.debug(`Cliente desconectado: ${client.id}`);
  }

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
      }
      await client.leave(roomName(data.sessionCode));
    }
  }

  @SubscribeMessage('state:resync')
  async handleResync(
    @ConnectedSocket() client: Socket,
  ): Promise<
    { session: SessionState | null; players: Player[] } | ErrorPayload
  > {
    try {
      const data = client.data as Partial<SocketData>;
      if (!data?.sessionCode) {
        return {
          code: ErrorCode.SESSION_NOT_FOUND,
          message: 'Socket sin sesión asociada',
        };
      }
      const session = await this.sessions.getState(data.sessionCode);
      const players = await this.sessions.listPlayers(data.sessionCode);
      return { session, players };
    } catch (err) {
      return this.filter.toErrorPayload(err);
    }
  }
}
