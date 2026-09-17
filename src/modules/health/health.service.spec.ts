import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HealthService } from './health.service';
import { SupabaseService } from '../../database/supabase.service';

describe('HealthService', () => {
  let service: HealthService;
  let supabaseMock: any;

  beforeEach(async () => {
    supabaseMock = {
      getAdmin: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [{ id: '1' }],
              error: null,
            }),
          }),
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: SupabaseService,
          useValue: supabaseMock,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('liveness', () => {
    it('should return alive status', () => {
      const result = service.liveness();

      expect(result.status).toBe('alive');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime_seconds).toBeGreaterThanOrEqual(0);
    });
  });

  describe('check', () => {
    it('should return healthy status when Supabase is up', async () => {
      const result = await service.check();

      expect(result.status).toBe('healthy');
      expect(result.dependencies.supabase.status).toBe('up');
      expect(result.system.memory).toBeDefined();
      expect(result.system.node_version).toBeDefined();
    });

    it('should return unhealthy when Supabase is down', async () => {
      supabaseMock.getAdmin = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Connection failed' },
            }),
          }),
        }),
      });

      const result = await service.check();

      expect(result.status).toBe('unhealthy');
      expect(result.dependencies.supabase.status).toBe('down');
    });
  });

  describe('readiness', () => {
    it('should return ready when Supabase is up', async () => {
      const result = await service.readiness();

      expect(result.status).toBe('ready');
      expect(result.dependencies.supabase.status).toBe('up');
    });
  });
});
