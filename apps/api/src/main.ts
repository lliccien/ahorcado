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

  // En desarrollo permitimos cualquier origen para poder jugar desde la LAN
  // (celulares de la familia conectándose por WiFi a la IP del host) sin
  // pelearnos con CORS. En producción el navegador entra por el reverse
  // proxy (mismo origen), así que CORS solo debería abrirse explícitamente
  // vía CORS_ORIGIN si por alguna razón se sirve desde otro dominio.
  const isDev = process.env.NODE_ENV !== 'production';
  const corsEnv = process.env.CORS_ORIGIN?.trim();
  const corsOrigin: boolean | string[] = isDev
    ? true
    : corsEnv
      ? corsEnv.split(',').map((o) => o.trim()).filter(Boolean)
      : false;

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });
  if (isDev) {
    logger.log('CORS abierto (NODE_ENV=development)');
  } else if (Array.isArray(corsOrigin) && corsOrigin.length > 0) {
    logger.log(`CORS restringido a: ${corsOrigin.join(', ')}`);
  } else {
    logger.log('CORS cerrado (mismo origen vía reverse proxy)');
  }

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

  // Escuchar en todas las interfaces para que celulares en LAN puedan
  // conectarse usando la IP del host (no solo localhost).
  await app.listen(port, '0.0.0.0');
  logger.log(`API escuchando en: http://localhost:${port}`);
  logger.log(`Swagger: http://localhost:${port}/api/docs`);
  logger.log(`WebSocket namespace /game listo`);
}
void bootstrap();
