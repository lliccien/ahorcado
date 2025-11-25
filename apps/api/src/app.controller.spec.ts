import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';

describe('AppController', () => {
  let appController: AppController;
  let healthCheckService: HealthCheckService;
  let db: TypeOrmHealthIndicator;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn().mockResolvedValue({
              status: 'ok',
              info: { database: { status: 'up' } },
            }),
          },
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: {
            pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
          },
        },
        {
          provide: MemoryHealthIndicator,
          useValue: {
            checkHeap: jest.fn().mockResolvedValue({ memory_heap: { status: 'up' } }),
            checkRSS: jest.fn().mockResolvedValue({ memory_rss: { status: 'up' } }),
          },
        },
        {
          provide: DiskHealthIndicator,
          useValue: {
            checkStorage: jest.fn().mockResolvedValue({ disk: { status: 'up' } }),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    healthCheckService = app.get<HealthCheckService>(HealthCheckService);
    db = app.get<TypeOrmHealthIndicator>(TypeOrmHealthIndicator);
  });

  describe('root', () => {
    it('should return welcome message', () => {
      expect(appController.getHello()).toBe('NestJS API is running! 🚀');
    });
  });

  describe('health check', () => {
    it('should return health status', async () => {
      const result = await appController.check();
      expect(result).toHaveProperty('status', 'ok');
      expect(healthCheckService.check).toHaveBeenCalled();
    });
  });

  describe('liveness', () => {
    it('should return ok for liveness probe', async () => {
      const result = await appController.liveness();
      expect(result).toBeDefined();
      expect(healthCheckService.check).toHaveBeenCalledWith([]);
    });
  });

  describe('readiness', () => {
    it('should check database for readiness probe', async () => {
      await appController.readiness();
      expect(db.pingCheck).toHaveBeenCalledWith('database');
    });
  });
});
