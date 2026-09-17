import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { SupabaseService } from '../../database/supabase.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
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
        CategoriesService,
        {
          provide: SupabaseService,
          useValue: { getAdmin: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(qb) }) },
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create category', async () => {
      qb.single.mockResolvedValueOnce({
        data: { id: 'c1', merchant_id: 'm1', name: 'Minuman', is_active: true },
        error: null,
      });

      const result = await service.create({ merchant_id: 'm1', name: 'Minuman' });
      expect(result.id).toBe('c1');
      expect(result.name).toBe('Minuman');
    });
  });

  describe('findById', () => {
    it('should return category if found', async () => {
      qb.maybeSingle.mockResolvedValueOnce({
        data: { id: 'c1', name: 'Minuman' },
        error: null,
      });
      const result = await service.findById('c1');
      expect(result.id).toBe('c1');
    });

    it('should throw NotFoundException if not found', async () => {
      qb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete category', async () => {
      qb.eq.mockResolvedValueOnce({ error: null });
      const result = await service.remove('c1');
      expect(result.message).toBe('Kategori berhasil dihapus');
    });
  });
});
