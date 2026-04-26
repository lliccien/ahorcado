import { HttpException, HttpStatus } from '@nestjs/common';

import { ErrorCode } from '@ahorcado/shared';

export class DomainError extends HttpException {
  constructor(
    public readonly errorCode: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ code: errorCode, message }, status);
  }
}

export const errSessionNotFound = (code: string) =>
  new DomainError(
    ErrorCode.SESSION_NOT_FOUND,
    `No existe una sesión activa con el código ${code}`,
    HttpStatus.NOT_FOUND,
  );

export const errSessionAlreadyStarted = () =>
  new DomainError(
    ErrorCode.SESSION_ALREADY_STARTED,
    'La partida ya está en curso',
    HttpStatus.CONFLICT,
  );

export const errSessionFinished = () =>
  new DomainError(
    ErrorCode.SESSION_FINISHED,
    'Esta sesión ya finalizó',
    HttpStatus.CONFLICT,
  );

export const errNameTaken = (name: string) =>
  new DomainError(
    ErrorCode.NAME_TAKEN,
    `Ya hay un jugador con el nombre "${name}" en esta sala`,
    HttpStatus.CONFLICT,
  );

export const errPlayerNotFound = () =>
  new DomainError(
    ErrorCode.PLAYER_NOT_FOUND,
    'El jugador no pertenece a esta sesión',
    HttpStatus.NOT_FOUND,
  );

export const errNotHost = () =>
  new DomainError(
    ErrorCode.NOT_HOST,
    'Esta acción es exclusiva del host',
    HttpStatus.FORBIDDEN,
  );

export const errInternal = (msg: string) =>
  new DomainError(
    ErrorCode.INTERNAL,
    msg,
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
