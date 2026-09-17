import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { BannersService } from './banners.service';
import { SupabaseService } from '../../database/supabase.service';

describe('BannersService', () => {
  let service: BannersService;
  let qb: any;

  beforeEach(async () => {
    qb = {
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      delete: vi.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BannersService,
        {
          provide: SupabaseService,
          useValue: { getAdmin: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(qb) }) },
        },
      ],
    }).compile();

    service = module.get<BannersService>(BannersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create banner', async () => {
      const dto = {
        title: 'Promo',
        image_url: 'https://example.com/img.jpg',
        position: 'TOP' as const,
      };

      qb.single.mockResolvedValueOnce({
        data: { id: 'b1', ...dto, is_active: true },
        error: null,
      });

      const result = await service.create(dto);
      expect(result.id).toBe('b1');
      expect(result.title).toBe('Promo');
    });
  });

  describe('findAll', () => {
    it('should return all banners', async () => {
      qb.order.mockReturnValueOnce(qb);
      qb.order.mockResolvedValueOnce({
        data: [{ id: 'b1', title: 'Promo' }],
        error: null,
      });

      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should return banner if found', async () => {
      qb.maybeSingle.mockResolvedValueOnce({
        data: { id: 'b1', title: 'Promo' },
        error: null,
      });

      const result = await service.findById('b1');
      expect(result.id).toBe('b1');
    });

    it('should throw NotFoundException if not found', async () => {
      qb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggle', () => {
    it('should toggle banner active status', async () => {
      qb.single.mockResolvedValueOnce({
        data: { id: 'b1', is_active: false },
        error: null,
      });

      const result = await service.toggle('b1', false);
      expect(result.is_active).toBe(false);
    });
  });

  describe('remove', () => {
    it('should delete banner', async () => {
      qb.eq.mockResolvedValueOnce({ error: null });

      const result = await service.remove('b1');
      expect(result.message).toBe('Banner berhasil dihapus');
    });
  });
});
