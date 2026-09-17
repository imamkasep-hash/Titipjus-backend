import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { SupabaseService } from '../../database/supabase.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

describe('DriversService', () => {
  let service: DriversService;
  let qb: any;

  beforeEach(async () => {
    qb = {
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      delete: vi.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriversService,
        {
          provide: SupabaseService,
          useValue: { getAdmin: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(qb) }) },
        },
        {
          provide: RealtimeGateway,
          useValue: { emitToUser: vi.fn(), emitToOrder: vi.fn() },
        },
      ],
    }).compile();

    service = module.get<DriversService>(DriversService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create driver profile', async () => {
      const dto = {
        vehicle_type: 'Motor',
        vehicle_plate: 'B 1234 XYZ',
        current_location: [106.8, -6.2] as [number, number],
      };

      qb.single.mockResolvedValueOnce({
        data: { id: 'd1', user_id: 'u1', ...dto, is_online: false, is_busy: false },
        error: null,
      });

      const result = await service.create('u1', dto);
      expect(result.id).toBe('d1');
      expect(result.vehicle_type).toBe('Motor');
    });
  });

  describe('findAll', () => {
    it('should return list of drivers', async () => {
      qb.order.mockResolvedValueOnce({
        data: [{ id: 'd1' }, { id: 'd2' }],
        error: null,
      });

      const result = await service.findAll();
      expect(result).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('should return driver if found', async () => {
      qb.maybeSingle.mockResolvedValueOnce({
        data: { id: 'd1', vehicle_type: 'Motor' },
        error: null,
      });

      const result = await service.findById('d1');
      expect(result.id).toBe('d1');
    });

    it('should throw NotFoundException if not found', async () => {
      qb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUserId', () => {
    it('should return driver profile of user', async () => {
      qb.maybeSingle.mockResolvedValueOnce({
        data: { id: 'd1', user_id: 'u1' },
        error: null,
      });

      const result = await service.findByUserId('u1');
      expect(result.id).toBe('d1');
    });
  });

  describe('findAvailable', () => {
    it('should return online & not busy drivers', async () => {
      qb.eq.mockReturnValueOnce(qb);
      qb.eq.mockResolvedValueOnce({
        data: [{ id: 'd1', is_online: true, is_busy: false }],
        error: null,
      });

      const result = await service.findAvailable();
      expect(result).toHaveLength(1);
    });
  });

  describe('remove', () => {
    it('should delete driver', async () => {
      qb.eq.mockResolvedValueOnce({ error: null });

      const result = await service.remove('d1');
      expect(result.message).toBe('Driver berhasil dihapus');
    });
  });
});
