import { Logger } from '@nestjs/common';
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
import type { Server, Socket } from 'socket.io';
import { WS_NAMESPACE } from '@ahorcado/shared';

@WebSocketGateway({
  namespace: WS_NAMESPACE,
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  afterInit(): void {
    this.logger.log(`Gateway listo en namespace ${WS_NAMESPACE}`);
  }

  handleConnection(client: Socket): void {
    this.logger.debug(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('ping')
  handlePing(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ): { ok: true; echo: unknown; clientId: string } {
    return { ok: true, echo: payload, clientId: client.id };
  }
}
