import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CreateSessionDto } from './dto/create-session.dto';
import { SessionsService } from './sessions.service';

@ApiTags('Sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Crea una sesión de juego',
    description:
      'Genera un código corto, registra al host y deja la sesión en estado LOBBY esperando que se unan jugadores.',
  })
  @ApiResponse({
    status: 201,
    description: 'Sesión creada',
    schema: {
      example: {
        code: 'B7XK29',
        sessionId: '7f4...',
        hostPlayerId: 'a1b...',
      },
    },
  })
  async create(@Body() dto: CreateSessionDto) {
    const { state, host } = await this.sessions.createSession(dto);
    return {
      code: state.code,
      sessionId: state.id,
      hostPlayerId: host.id,
    };
  }

  @Get(':code')
  @ApiOperation({
    summary: 'Consulta el estado público de una sesión',
    description:
      'Útil para validar el código antes de abrir el WebSocket. No expone datos privados de la ronda.',
  })
  @ApiParam({ name: 'code', example: 'B7XK29' })
  async getPublicState(@Param('code') code: string) {
    return this.sessions.getSessionPublic(code.trim().toUpperCase());
  }
}
