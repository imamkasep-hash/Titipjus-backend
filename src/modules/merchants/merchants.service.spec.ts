import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MerchantsService } from './merchants.service';
import { SupabaseService } from '../../database/supabase.service';

describe('MerchantsService', () => {
  let service: MerchantsService;
  let supabaseMock: any;
  let qb: any;

  beforeEach(async () => {
    qb = {
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      delete: vi.fn().mockReturnThis(),
    };

    supabaseMock = {
      getAdmin: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue(qb),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantsService,
        { provide: SupabaseService, useValue: supabaseMock },
      ],
    }).compile();

    service = module.get<MerchantsService>(MerchantsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create merchant with location', async () => {
      const dto = {
        store_name: 'Toko Test',
        description: 'Test',
        address: 'Jl. Test',
        location: [106.8, -6.2] as [number, number],
        is_open: true,
      };

      qb.single.mockResolvedValueOnce({
        data: { id: 'm1', ...dto },
        error: null,
      });

      const result = await service.create('user-1', dto);

      expect(result.id).toBe('m1');
      expect(result.store_name).toBe('Toko Test');
    });
  });

  describe('findAll', () => {
    it('should return list of merchants', async () => {
      qb.order.mockResolvedValueOnce({
        data: [
          { id: 'm1', store_name: 'Toko 1' },
          { id: 'm2', store_name: 'Toko 2' },
        ],
        error: null,
      });

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].store_name).toBe('Toko 1');
    });

    it('should return empty array when no merchants', async () => {
      qb.order.mockResolvedValueOnce({ data: null, error: null });

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return merchant if found', async () => {
      qb.maybeSingle.mockResolvedValueOnce({
        data: { id: 'm1', store_name: 'Toko' },
        error: null,
      });

      const result = await service.findById('m1');

      expect(result.id).toBe('m1');
    });

    it('should throw NotFoundException if not found', async () => {
      qb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByUserId', () => {
    it('should return merchants of a user', async () => {
      qb.eq.mockResolvedValueOnce({
        data: [{ id: 'm1', user_id: 'u1' }],
        error: null,
      });

      const result = await service.findByUserId('u1');

      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update merchant', async () => {
      qb.single.mockResolvedValueOnce({
        data: { id: 'm1', store_name: 'Toko Updated' },
        error: null,
      });

      const result = await service.update('m1', {
        store_name: 'Toko Updated',
      });

      expect(result.store_name).toBe('Toko Updated');
    });

    it('should convert location to POINT format when updating', async () => {
      qb.single.mockResolvedValueOnce({
        data: { id: 'm1' },
        error: null,
      });

      await service.update('m1', {
        location: [106.8, -6.2] as [number, number],
      });

      expect(qb.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete merchant', async () => {
      qb.eq.mockResolvedValueOnce({ error: null });

      const result = await service.remove('m1');

      expect(result.message).toBe('Merchant berhasil dihapus');
    });
  });

  describe('setSchedules', () => {
    it('should reject invalid schedule (close < open)', async () => {
      qb.maybeSingle.mockResolvedValueOnce({
        data: { id: 'm1' },
        error: null,
      });

      const dto = {
        schedules: [
          {
            day_of_week: 1,
            open_time: '22:00',
            close_time: '08:00',
          },
        ],
      };

      await expect(service.setSchedules('m1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getOperatingStatus', () => {
    it('should return operating status', async () => {
      // getOperatingStatus pakai chain: .select().eq().eq()
      // eq() pertama chain, eq() kedua resolve
      let eqCallCount = 0;
      qb.eq = vi.fn().mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount === 2) {
          return Promise.resolve({
            data: [
              {
                day_of_week: new Date().getDay(),
                open_time: '00:00:00',
                close_time: '23:59:59',
                is_active: true,
              },
            ],
            error: null,
          });
        }
        return qb;
      });

      const result = await service.getOperatingStatus('m1');

      expect(result.merchant_id).toBe('m1');
      expect(result.is_open_now).toBe(true);
      expect(result.current_day).toBeDefined();
      expect(result.current_time).toBeDefined();
      expect(result.timezone).toBe('Asia/Jakarta');
    });
  });
});
