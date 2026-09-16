import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Health check lengkap.
   */
  @Get()
  check() {
    return this.healthService.check();
  }

  /**
   * Liveness probe.
   */
  @Get('live')
  liveness() {
    return this.healthService.liveness();
  }

  /**
   * Readiness probe.
   */
  @Get('ready')
  readiness() {
    return this.healthService.readiness();
  }
}
