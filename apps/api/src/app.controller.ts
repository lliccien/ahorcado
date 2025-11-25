import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get welcome message' })
  @ApiResponse({ status: 200, description: 'Returns welcome message' })
  getHello(): string {
    return 'NestJS API is running! 🚀';
  }

  @Get('health')
  @HealthCheck()
  @ApiOperation({ 
    summary: 'Complete health check',
    description: 'Checks database connection, memory usage, and disk space. Returns detailed status of all components.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'All health checks passed',
    schema: {
      example: {
        status: 'ok',
        info: {
          database: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
          disk: { status: 'up' }
        },
        error: {},
        details: {
          database: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
          disk: { status: 'up' }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 503, 
    description: 'One or more health checks failed',
    schema: {
      example: {
        status: 'error',
        info: {
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
          disk: { status: 'up' }
        },
        error: {
          database: { status: 'down', message: 'Connection timeout' }
        },
        details: {
          database: { status: 'down', message: 'Connection timeout' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
          disk: { status: 'up' }
        }
      }
    }
  })
  check() {
    return this.health.check([
      // Check database connection
      () => this.db.pingCheck('database'),
      
      // Check heap memory doesn't exceed 150MB
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      
      // Check RSS memory doesn't exceed 300MB
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
      
      // Check disk storage (50% available)
      () => this.disk.checkStorage('disk', { 
        path: '/', 
        thresholdPercent: 0.5 
      }),
    ]);
  }

  @Get('health/liveness')
  @HealthCheck()
  @ApiOperation({ 
    summary: 'Kubernetes liveness probe',
    description: 'Lightweight check to verify the application is running. Used by Kubernetes to restart unhealthy pods.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Application is alive',
    schema: {
      example: {
        status: 'ok',
        info: {},
        error: {},
        details: {}
      }
    }
  })
  liveness() {
    // For Kubernetes liveness probe - just checks if app responds
    return this.health.check([]);
  }

  @Get('health/readiness')
  @HealthCheck()
  @ApiOperation({ 
    summary: 'Kubernetes readiness probe',
    description: 'Checks if the application is ready to accept traffic by verifying database connectivity. Used by Kubernetes to control traffic routing.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Application is ready',
    schema: {
      example: {
        status: 'ok',
        info: {
          database: { status: 'up' }
        },
        error: {},
        details: {
          database: { status: 'up' }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 503, 
    description: 'Application not ready',
    schema: {
      example: {
        status: 'error',
        info: {},
        error: {
          database: { status: 'down', message: 'Database unavailable' }
        },
        details: {
          database: { status: 'down', message: 'Database unavailable' }
        }
      }
    }
  })
  readiness() {
    // For Kubernetes readiness probe - checks critical dependencies
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }
}
