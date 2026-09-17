import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PromosService } from './promos.service';
import { SupabaseService } from '../../database/supabase.service';

describe('PromosService', () => {
  let service: PromosService;
  let qb: any;

  beforeEach(async () => {
    qb = {
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      delete: vi.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromosService,
        {
          provide: SupabaseService,
          useValue: { getAdmin: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(qb) }) },
        },
      ],
    }).compile();

    service = module.get<PromosService>(PromosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should reject PERCENTAGE > 100', async () => {
      const dto = {
        code: 'TEST',
        discount_type: 'PERCENTAGE' as const,
        discount_value: 150,
        valid_until: '2030-12-31T23:59:59.000Z',
      };

      qb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate code', async () => {
      const dto = {
        code: 'DUP',
        discount_type: 'FIXED' as const,
        discount_value: 10000,
        valid_until: '2030-12-31T23:59:59.000Z',
      };

      qb.maybeSingle.mockResolvedValueOnce({ data: { id: 'p1' }, error: null });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should create promo successfully', async () => {
      const dto = {
        code: 'NEW50',
        discount_type: 'PERCENTAGE' as const,
        discount_value: 50,
        valid_until: '2030-12-31T23:59:59.000Z',
      };

      qb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      qb.single.mockResolvedValueOnce({
        data: { id: 'p1', code: 'NEW50', is_active: true },
        error: null,
      });

      const result = await service.create(dto);
      expect(result.id).toBe('p1');
      expect(result.code).toBe('NEW50');
    });
  });

  describe('findById', () => {
    it('should return promo if found', async () => {
      qb.maybeSingle.mockResolvedValueOnce({
        data: { id: 'p1', code: 'NEW50' },
        error: null,
      });

      const result = await service.findById('p1');
      expect(result.id).toBe('p1');
    });

    it('should throw NotFoundException if not found', async () => {
      qb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('validate', () => {
    it('should throw NotFoundException if code not found', async () => {
      qb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      await expect(
        service.validate('u1', { code: 'NGACO', order_amount: 30000 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject inactive promo', async () => {
      qb.maybeSingle.mockResolvedValueOnce({
        data: {
          id: 'p1',
          code: 'NEW50',
          is_active: false,
          valid_from: '2020-01-01T00:00:00.000Z',
          valid_until: '2030-12-31T23:59:59.000Z',
        },
        error: null,
      });

      await expect(
        service.validate('u1', { code: 'NEW50', order_amount: 30000 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('toggle', () => {
    it('should toggle promo', async () => {
      qb.single.mockResolvedValueOnce({
        data: { id: 'p1', is_active: false },
        error: null,
      });

      const result = await service.toggle('p1', false);
      expect(result.is_active).toBe(false);
    });
  });

  describe('remove', () => {
    it('should delete promo', async () => {
      qb.eq.mockResolvedValueOnce({ error: null });

      const result = await service.remove('p1');
      expect(result.message).toBe('Promo berhasil dihapus');
    });
  });
});
