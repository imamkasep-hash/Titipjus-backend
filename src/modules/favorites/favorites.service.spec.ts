import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { SupabaseService } from '../../database/supabase.service';

describe('FavoritesService', () => {
  let service: FavoritesService;
  let qb: any;

  beforeEach(async () => {
    qb = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      delete: vi.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        {
          provide: SupabaseService,
          useValue: { getAdmin: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(qb) }) },
        },
      ],
    }).compile();

    service = module.get<FavoritesService>(FavoritesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('add', () => {
    it('should throw NotFoundException if merchant not found', async () => {
      qb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      await expect(service.add('u1', 'm1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if already favorite', async () => {
      qb.maybeSingle.mockResolvedValueOnce({
        data: { id: 'm1', store_name: 'Toko' },
        error: null,
      });
      qb.maybeSingle.mockResolvedValueOnce({
        data: { id: 'f1' },
        error: null,
      });

      await expect(service.add('u1', 'm1')).rejects.toThrow(ConflictException);
    });

    it('should add favorite successfully', async () => {
      qb.maybeSingle.mockResolvedValueOnce({
        data: { id: 'm1', store_name: 'Toko' },
        error: null,
      });
      qb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      qb.single.mockResolvedValueOnce({
        data: { id: 'f1', user_id: 'u1', merchant_id: 'm1' },
        error: null,
      });

      const result = await service.add('u1', 'm1');
      expect(result.id).toBe('f1');
      expect(result.merchant_name).toBe('Toko');
    });
  });

  describe('remove', () => {
    it('should remove favorite', async () => {
      qb.eq.mockReturnValueOnce(qb);
      qb.eq.mockResolvedValueOnce({ error: null });

      const result = await service.remove('u1', 'm1');
      expect(result.message).toBe('Berhasil dihapus dari favorite');
    });
  });

  describe('checkFavorite', () => {
    it('should return is_favorite true', async () => {
      qb.maybeSingle.mockResolvedValueOnce({
        data: { id: 'f1' },
        error: null,
      });

      const result = await service.checkFavorite('u1', 'm1');
      expect(result.is_favorite).toBe(true);
      expect(result.favorite_id).toBe('f1');
    });

    it('should return is_favorite false', async () => {
      qb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      const result = await service.checkFavorite('u1', 'm1');
      expect(result.is_favorite).toBe(false);
      expect(result.favorite_id).toBe(null);
    });
  });
});
