import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches, Length } from 'class-validator';

export class GuessLetterDto {
  @ApiProperty({
    description: 'Letra adivinada (a-z o ñ). Se normaliza a minúscula.',
    example: 'a',
    minLength: 1,
    maxLength: 1,
  })
  @IsString()
  @Length(1, 1)
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .toLowerCase()
      : value,
  )
  @Matches(/^[a-zñ]$/, { message: 'letra inválida (solo a-z o ñ)' })
  letter!: string;
}
