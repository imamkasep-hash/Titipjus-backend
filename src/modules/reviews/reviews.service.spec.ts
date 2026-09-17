import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { SupabaseService } from '../../database/supabase.service';

describe('ReviewsService', () => {
  let service: ReviewsService;
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
        ReviewsService,
        {
          provide: SupabaseService,
          useValue: { getAdmin: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(qb) }) },
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw NotFoundException if order not found', async () => {
      qb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      await expect(
        service.create('u1', {
          order_id: 'o1',
          target_type: 'merchant',
          target_id: 'm1',
          rating: 5,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if not consumer', async () => {
      qb.maybeSingle.mockResolvedValueOnce({
        data: { id: 'o1', consumer_id: 'OTHER_USER', status: 'COMPLETED' },
        error: null,
      });

      await expect(
        service.create('u1', {
          order_id: 'o1',
          target_type: 'merchant',
          target_id: 'm1',
          rating: 5,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if order not COMPLETED', async () => {
      qb.maybeSingle.mockResolvedValueOnce({
        data: { id: 'o1', consumer_id: 'u1', status: 'PENDING_PAYMENT' },
        error: null,
      });

      await expect(
        service.create('u1', {
          order_id: 'o1',
          target_type: 'merchant',
          target_id: 'm1',
          rating: 5,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByTarget', () => {
    it('should return reviews for merchant', async () => {
      qb.order.mockResolvedValueOnce({
        data: [{ id: 'r1', rating: 5, target_type: 'merchant' }],
        error: null,
      });

      const result = await service.findByTarget('merchant', 'm1');
      expect(result).toHaveLength(1);
    });
  });

  describe('findByOrder', () => {
    it('should return reviews for order', async () => {
      qb.eq.mockResolvedValueOnce({
        data: [{ id: 'r1', order_id: 'o1' }],
        error: null,
      });

      const result = await service.findByOrder('o1');
      expect(result).toHaveLength(1);
    });
  });

  describe('getRatingSummary', () => {
    it('should return empty summary when no reviews', async () => {
      qb.eq.mockReturnValueOnce(qb);
      qb.eq.mockResolvedValueOnce({ data: [], error: null });

      const result = await service.getRatingSummary('merchant', 'm1');
      expect(result.total_reviews).toBe(0);
      expect(result.average_rating).toBe(0);
    });

    it('should calculate average rating', async () => {
      qb.eq.mockReturnValueOnce(qb);
      qb.eq.mockResolvedValueOnce({
        data: [{ rating: 5 }, { rating: 4 }, { rating: 5 }],
        error: null,
      });

      const result = await service.getRatingSummary('merchant', 'm1');
      expect(result.total_reviews).toBe(3);
      expect(result.average_rating).toBe(4.67); // (5+4+5)/3 = 4.67
    });
  });
});
