import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { SupabaseService } from '../../database/supabase.service';
import { LedgerService } from '../ledger/ledger.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

describe('RefundsService', () => {
  let service: RefundsService;
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
        RefundsService,
        {
          provide: SupabaseService,
          useValue: { getAdmin: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(qb) }) },
        },
        {
          provide: LedgerService,
          useValue: {
            getOrCreateWallet: vi.fn().mockResolvedValue({ id: 'w1', balance: 100000 }),
            createTransaction: vi.fn().mockResolvedValue({ id: 'tx1' }),
          },
        },
        {
          provide: RealtimeGateway,
          useValue: { emitToUser: vi.fn() },
        },
      ],
    }).compile();

    service = module.get<RefundsService>(RefundsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRequest', () => {
    it('should throw NotFoundException if order not found', async () => {
      qb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      await expect(
        service.createRequest('u1', { order_id: 'o1', amount: 10000, reason: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not owner', async () => {
      qb.maybeSingle.mockResolvedValueOnce({
        data: { id: 'o1', consumer_id: 'OTHER', status: 'PAID', total_amount: 50000 },
        error: null,
      });

      await expect(
        service.createRequest('u1', { order_id: 'o1', amount: 10000, reason: 'Test' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if amount > total', async () => {
      qb.maybeSingle.mockResolvedValueOnce({
        data: { id: 'o1', consumer_id: 'u1', status: 'PAID', total_amount: 5000 },
        error: null,
      });

      await expect(
        service.createRequest('u1', { order_id: 'o1', amount: 10000, reason: 'Test' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById', () => {
    it('should return refund if found', async () => {
      qb.maybeSingle.mockResolvedValueOnce({
        data: { id: 'r1', status: 'PENDING', amount: 10000 },
        error: null,
      });

      const result = await service.findById('r1');
      expect(result.id).toBe('r1');
    });

    it('should throw NotFoundException if not found', async () => {
      qb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUser', () => {
    it('should return refunds of user', async () => {
      qb.order.mockResolvedValueOnce({
        data: [{ id: 'r1', user_id: 'u1' }],
        error: null,
      });

      const result = await service.findByUser('u1');
      expect(result).toHaveLength(1);
    });
  });

  describe('getStats', () => {
    it('should return refund statistics', async () => {
      qb.select.mockResolvedValueOnce({
        data: [
          { status: 'PENDING', amount: 10000 },
          { status: 'COMPLETED', amount: 20000 },
        ],
        error: null,
      });

      const result = await service.getStats();
      expect(result.total_refunds).toBe(2);
      expect(result.by_status.PENDING).toBe(1);
      expect(result.by_status.COMPLETED).toBe(1);
    });
  });
});
