import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { RedisIoAdapter } from './modules/realtime/redis-io.adapter';
import { RedisService } from './modules/redis/redis.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const port = process.env.API_PORT || 3000;

  const corsEnv = process.env.CORS_ORIGIN;
  const corsOrigin = corsEnv
    ? corsEnv.split(',').map((o) => o.trim())
    : true;

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const redis = app.get(RedisService);
  const ioAdapter = new RedisIoAdapter(
    app,
    redis.getPubClient(),
    redis.getSubClient(),
  );
  await ioAdapter.connectToRedis();
  app.useWebSocketAdapter(ioAdapter);

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Ahorcado API')
    .setDescription('API en tiempo real para el juego del ahorcado multijugador')
    .setVersion('1.0')
    .addTag('App', 'Endpoints de salud y bienvenida')
    .addTag('Sessions', 'Creación y consulta de sesiones de juego')
    .addTag('Words', 'Categorías y palabras del juego')
    .addTag('Leaderboard', 'Histórico de partidas')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Ahorcado API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  await app.listen(port);
  logger.log(`API escuchando en: http://localhost:${port}`);
  logger.log(`Swagger: http://localhost:${port}/api/docs`);
  logger.log(`WebSocket namespace /game listo`);
}
void bootstrap();
