import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

import {
  CATEGORY_SLUGS,
  MAX_ROUNDS,
  MIN_ROUNDS,
  PLAYER_NAME_MAX,
  PLAYER_NAME_MIN,
  RANDOM_CATEGORY,
} from '@ahorcado/shared';

const ALLOWED_CATEGORIES = [...CATEGORY_SLUGS, RANDOM_CATEGORY] as string[];

export class CreateSessionDto {
  @ApiProperty({
    description: 'Número total de rondas',
    minimum: MIN_ROUNDS,
    maximum: MAX_ROUNDS,
    example: 5,
  })
  @IsInt()
  @Min(MIN_ROUNDS)
  @Max(MAX_ROUNDS)
  totalRounds!: number;

  @ApiProperty({
    description:
      'Categoría a usar en cada ronda. Usa "random" para que el servidor elija una distinta cada ronda',
    enum: ALLOWED_CATEGORIES,
    example: 'animales',
  })
  @IsString()
  @IsIn(ALLOWED_CATEGORIES, {
    message: `category debe ser una de: ${ALLOWED_CATEGORIES.join(', ')}`,
  })
  category!: string;

  @ApiProperty({
    description: 'Nombre del jugador host',
    minLength: PLAYER_NAME_MIN,
    maxLength: PLAYER_NAME_MAX,
    example: 'Luis',
  })
  @IsString()
  @Length(PLAYER_NAME_MIN, PLAYER_NAME_MAX)
  @Matches(/^[\p{L}0-9 _-]+$/u, {
    message: 'hostName solo puede contener letras, números, espacios, _ o -',
  })
  hostName!: string;
}
