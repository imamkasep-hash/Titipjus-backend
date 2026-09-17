import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { SupabaseService } from '../../database/supabase.service';

describe('ShiftsService', () => {
  let service: ShiftsService;
  let qb: any;

  beforeEach(async () => {
    qb = {
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      delete: vi.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftsService,
        {
          provide: SupabaseService,
          useValue: { getAdmin: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(qb) }) },
        },
      ],
    }).compile();

    service = module.get<ShiftsService>(ShiftsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createZone', () => {
    it('should reject polygon not closed', async () => {
      const dto = {
        name: 'Zone Test',
        coordinates: [
          [106.8, -6.2],
          [106.9, -6.2],
          [106.9, -6.3], // tidak balik ke titik awal
        ],
      };

      await expect(service.createZone(dto)).rejects.toThrow(BadRequestException);
    });

    it('should create zone successfully', async () => {
      const dto = {
        name: 'Zone Jakarta',
        coordinates: [
          [106.8, -6.2],
          [106.9, -6.2],
          [106.9, -6.3],
          [106.8, -6.2], // closed
        ],
      };

      qb.single.mockResolvedValueOnce({
        data: { id: 'z1', name: 'Zone Jakarta', is_active: true },
        error: null,
      });

      const result = await service.createZone(dto);
      expect(result.id).toBe('z1');
      expect(result.name).toBe('Zone Jakarta');
    });
  });

  describe('findAllZones', () => {
    it('should return all zones', async () => {
      qb.order.mockResolvedValueOnce({
        data: [{ id: 'z1' }, { id: 'z2' }],
        error: null,
      });

      const result = await service.findAllZones();
      expect(result).toHaveLength(2);
    });
  });

  describe('findZoneById', () => {
    it('should return zone if found', async () => {
      qb.maybeSingle.mockResolvedValueOnce({
        data: { id: 'z1', name: 'Zone' },
        error: null,
      });

      const result = await service.findZoneById('z1');
      expect(result.id).toBe('z1');
    });

    it('should throw NotFoundException if not found', async () => {
      qb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      await expect(service.findZoneById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeZone', () => {
    it('should delete zone', async () => {
      qb.eq.mockResolvedValueOnce({ error: null });

      const result = await service.removeZone('z1');
      expect(result.message).toBe('Zone berhasil dihapus');
    });
  });

  describe('createShift', () => {
    it('should throw NotFoundException if driver not found', async () => {
      qb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      await expect(
        service.createShift('u1', {
          zone_id: 'z1',
          day_of_week: 1,
          start_time: '08:00',
          end_time: '16:00',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject if end_time <= start_time', async () => {
      qb.maybeSingle.mockResolvedValueOnce({
        data: { id: 'd1' },
        error: null,
      });
      qb.maybeSingle.mockResolvedValueOnce({
        data: { id: 'z1' },
        error: null,
      });

      await expect(
        service.createShift('u1', {
          zone_id: 'z1',
          day_of_week: 1,
          start_time: '16:00',
          end_time: '08:00',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
