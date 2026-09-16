import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Cek health Supabase (query simple).
   */
  private async checkSupabase(): Promise<{
    status: 'up' | 'down';
    latency_ms: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      const { error } = await this.supabase
        .getAdmin()
        .from('users')
        .select('id')
        .limit(1);

      const latency = Date.now() - start;

      if (error) {
        return { status: 'down', latency_ms: latency, error: error.message };
      }

      return { status: 'up', latency_ms: latency };
    } catch (err) {
      return {
        status: 'down',
        latency_ms: Date.now() - start,
        error: (err as Error).message,
      };
    }
  }

  /**
   * Cek health Redis (optional).
   */
  private async checkRedis(): Promise<{
    status: 'up' | 'down' | 'not_configured';
    latency_ms?: number;
    error?: string;
  }> {
    // Skip kalau Redis tidak di-configure
    if (!process.env.UPSTASH_REDIS_REST_URL) {
      return { status: 'not_configured' };
    }

    const start = Date.now();
    try {
      // Ping sederhana via fetch
      const res = await fetch(
        `${process.env.UPSTASH_REDIS_REST_URL}/ping`,
        {
          headers: {
            Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          },
        },
      );

      const latency = Date.now() - start;

      if (!res.ok) {
        return { status: 'down', latency_ms: latency };
      }

      return { status: 'up', latency_ms: latency };
    } catch (err) {
      return {
        status: 'down',
        latency_ms: Date.now() - start,
        error: (err as Error).message,
      };
    }
  }

  /**
   * Health check lengkap.
   */
  async check() {
    const [supabase, redis] = await Promise.all([
      this.checkSupabase(),
      this.checkRedis(),
    ]);

    const isHealthy =
      supabase.status === 'up' &&
      (redis.status === 'up' || redis.status === 'not_configured');

    const memUsage = process.memoryUsage();

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
      environment: process.env.NODE_ENV ?? 'development',
      version: '1.0.0',
      dependencies: {
        supabase,
        redis,
      },
      system: {
        memory: {
          rss_mb: Number((memUsage.rss / 1024 / 1024).toFixed(2)),
          heap_used_mb: Number(
            (memUsage.heapUsed / 1024 / 1024).toFixed(2),
          ),
          heap_total_mb: Number(
            (memUsage.heapTotal / 1024 / 1024).toFixed(2),
          ),
        },
        node_version: process.version,
        platform: process.platform,
      },
    };
  }

  /**
   * Liveness probe — cek server hidup.
   */
  liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  /**
   * Readiness probe — cek server siap terima traffic.
   */
  async readiness() {
    const supabase = await this.checkSupabase();

    const isReady = supabase.status === 'up';

    return {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      dependencies: { supabase },
    };
  }
}
