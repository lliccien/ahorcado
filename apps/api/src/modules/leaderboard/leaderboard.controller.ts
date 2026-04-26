import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { LeaderboardService } from './leaderboard.service';

@ApiTags('Leaderboard')
@Controller('sessions')
export class LeaderboardController {
  constructor(private readonly service: LeaderboardService) {}

  @Get(':code/leaderboard')
  @ApiOperation({
    summary: 'Devuelve el histórico de una sesión',
    description:
      'Consulta Postgres y retorna el leaderboard final, las rondas con su palabra y el ganador. Disponible mientras la sesión exista (incluso después de cerrar).',
  })
  @ApiParam({ name: 'code', example: 'B7XK29' })
  @ApiResponse({
    status: 200,
    description: 'Histórico encontrado',
    schema: {
      example: {
        exists: true,
        code: 'B7XK29',
        status: 'FINISHED',
        totalRounds: 3,
        finishedAt: '2026-04-25T22:31:50.000Z',
        leaderboard: [
          { playerId: '...', name: 'Pedro', wins: 2, roundsSolved: 2, fastestSolveMs: 4200 },
          { playerId: '...', name: 'Maria', wins: 1, roundsSolved: 1, fastestSolveMs: 7800 },
        ],
        rounds: [
          { roundNumber: 1, word: 'Camello', winnerPlayerId: '...', winnerName: 'Pedro' },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Sesión no encontrada' })
  async getByCode(@Param('code') code: string) {
    const result = await this.service.getByCode(code);
    if (!result.exists) {
      throw new NotFoundException(`No existe una sesión con código ${code}`);
    }
    return result;
  }
}
