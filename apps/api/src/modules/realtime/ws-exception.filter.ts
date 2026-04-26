import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';

import { ErrorCode, type ErrorPayload } from '@ahorcado/shared';

import { DomainError } from '../sessions/sessions.errors';

@Catch()
export class WsExceptionFilter
  extends BaseWsExceptionFilter
  implements ExceptionFilter
{
  private readonly logger = new Logger(WsExceptionFilter.name);

  override catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToWs();
    const client = ctx.getClient<Socket>();
    const payload = this.toErrorPayload(exception);

    // Si el handler tenía ack, devolvemos el error como respuesta del ack
    // (Socket.io espera que el handler retorne el valor; aquí emitimos por
    // canal "error" para clientes que escuchen broadcast). El emitter del
    // ack lo gestiona el gateway al hacer return; este filtro respalda el
    // canal genérico para errores no manejados.
    client.emit('error', payload);
    this.logger.warn(
      `WS error code=${payload.code} message="${payload.message}" client=${client.id}`,
    );
  }

  toErrorPayload(exception: unknown): ErrorPayload {
    if (exception instanceof DomainError) {
      return { code: exception.errorCode, message: exception.message };
    }
    if (exception instanceof WsException) {
      const data = exception.getError();
      if (typeof data === 'string') {
        return { code: ErrorCode.INTERNAL, message: data };
      }
      const obj = data as Partial<ErrorPayload>;
      return {
        code: obj.code ?? ErrorCode.INTERNAL,
        message: obj.message ?? 'Error de WebSocket',
      };
    }
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null) {
        const obj = response as Record<string, unknown>;
        const code =
          typeof obj.code === 'string'
            ? (obj.code as ErrorCode)
            : ErrorCode.INTERNAL;
        const message =
          typeof obj.message === 'string'
            ? obj.message
            : Array.isArray(obj.message)
              ? obj.message.join('; ')
              : exception.message;
        return { code, message };
      }
      return { code: ErrorCode.INTERNAL, message: exception.message };
    }
    if (exception instanceof Error) {
      this.logger.error(exception.stack ?? exception.message);
      return {
        code: ErrorCode.INTERNAL,
        message: 'Error interno del servidor',
      };
    }
    return {
      code: ErrorCode.INTERNAL,
      message: 'Error desconocido',
    };
  }
}
