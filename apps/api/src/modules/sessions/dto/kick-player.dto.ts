import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class KickPlayerDto {
  @ApiProperty({
    description: 'ID del jugador a expulsar de la sala',
    example: '7f4...',
  })
  @IsUUID()
  playerId!: string;
}
