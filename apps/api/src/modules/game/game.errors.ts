import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from '@ahorcado/shared';

import { DomainError } from '../sessions/sessions.errors';

export const errRoundNotActive = () =>
  new DomainError(
    ErrorCode.ROUND_NOT_ACTIVE,
    'No hay una ronda activa en esta sala',
    HttpStatus.CONFLICT,
  );

export const errAlreadyGuessed = (letter: string) =>
  new DomainError(
    ErrorCode.ALREADY_GUESSED,
    `Ya intentaste la letra "${letter.toUpperCase()}"`,
    HttpStatus.CONFLICT,
  );

export const errInvalidLetter = () =>
  new DomainError(
    ErrorCode.INVALID_LETTER,
    'Letra inválida',
    HttpStatus.BAD_REQUEST,
  );

export const errNotEnoughPlayers = () =>
  new DomainError(
    ErrorCode.NOT_ENOUGH_PLAYERS,
    'Se necesitan al menos 2 jugadores para iniciar',
    HttpStatus.CONFLICT,
  );
