import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

import {
  CODE_LENGTH,
  PLAYER_NAME_MAX,
  PLAYER_NAME_MIN,
} from '@ahorcado/shared';

export class JoinSessionDto {
  @ApiProperty({
    description: 'Código de 6 caracteres alfanuméricos (sin 0/O/1/I/L)',
    minLength: CODE_LENGTH,
    maxLength: CODE_LENGTH,
    example: 'B7XK29',
  })
  @IsString()
  @Length(CODE_LENGTH, CODE_LENGTH)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Matches(/^[2-9A-HJ-NP-Z]{6}$/, {
    message: 'code inválido (alfabeto sin ambigüedades)',
  })
  code!: string;

  @ApiProperty({
    description: 'Nombre del jugador',
    minLength: PLAYER_NAME_MIN,
    maxLength: PLAYER_NAME_MAX,
    example: 'María',
  })
  @IsString()
  @Length(PLAYER_NAME_MIN, PLAYER_NAME_MAX)
  @Matches(/^[\p{L}0-9 _-]+$/u, {
    message: 'name solo puede contener letras, números, espacios, _ o -',
  })
  name!: string;

  @ApiProperty({
    description:
      'Si el cliente ya tenía un playerId guardado en localStorage para esta sesión, lo envía para reanudar',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  resumePlayerId?: string;
}
