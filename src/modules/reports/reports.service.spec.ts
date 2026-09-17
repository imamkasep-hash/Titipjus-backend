import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { SupabaseService } from '../../database/supabase.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

describe('ReportsService', () => {
  let service: ReportsService;
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
        ReportsService,
        {
          provide: SupabaseService,
          useValue: { getAdmin: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(qb) }) },
        },
        {
          provide: RealtimeGateway,
          useValue: { emitToUser: vi.fn() },
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
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
          target_type: 'app',
          category: 'OTHER',
          title: 'Test Report',
          description: 'Test description here',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not owner', async () => {
      qb.maybeSingle.mockResolvedValueOnce({
        data: { id: 'o1', consumer_id: 'OTHER_USER' },
        error: null,
      });

      await expect(
        service.create('u1', {
          order_id: 'o1',
          target_type: 'app',
          category: 'OTHER',
          title: 'Test Report',
          description: 'Test description here',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create report successfully', async () => {
      qb.maybeSingle.mockResolvedValueOnce({
        data: { id: 'o1', consumer_id: 'u1' },
        error: null,
      });
      qb.single.mockResolvedValueOnce({
        data: {
          id: 'r1',
          title: 'Test Report',
          status: 'OPEN',
          reporter_id: 'u1',
        },
        error: null,
      });

      const result = await service.create('u1', {
        order_id: 'o1',
        target_type: 'app',
        category: 'OTHER',
        title: 'Test Report',
        description: 'Test description here',
      });

      expect(result.id).toBe('r1');
      expect(result.status).toBe('OPEN');
    });
  });

  describe('findAll', () => {
    it('should return all reports', async () => {
      qb.order.mockResolvedValueOnce({
        data: [{ id: 'r1' }, { id: 'r2' }],
        error: null,
      });

      const result = await service.findAll();
      expect(result).toHaveLength(2);
    });

    it('should filter by status', async () => {
      qb.eq.mockReturnValueOnce(qb);
      qb.order.mockResolvedValueOnce({
        data: [{ id: 'r1', status: 'OPEN' }],
        error: null,
      });

      const result = await service.findAll('OPEN');
      expect(result).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if not found', async () => {
      qb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      await expect(service.findById('r1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not owner', async () => {
      qb.maybeSingle.mockResolvedValueOnce({
        data: { id: 'r1', reporter_id: 'OTHER_USER' },
        error: null,
      });

      await expect(service.findById('r1', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('should return report if owner', async () => {
      qb.maybeSingle.mockResolvedValueOnce({
        data: { id: 'r1', reporter_id: 'u1', title: 'Report' },
        error: null,
      });

      const result = await service.findById('r1', 'u1');
      expect(result.id).toBe('r1');
    });
  });

  describe('updateStatus', () => {
    it('should reject RESOLVED without admin_response', async () => {
      qb.maybeSingle.mockResolvedValueOnce({
        data: { id: 'r1', status: 'OPEN', reporter_id: 'u1' },
        error: null,
      });

      await expect(
        service.updateStatus('r1', { status: 'RESOLVED' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update status to RESOLVED with response', async () => {
      qb.maybeSingle.mockResolvedValueOnce({
        data: { id: 'r1', status: 'OPEN', reporter_id: 'u1' },
        error: null,
      });
      qb.single.mockResolvedValueOnce({
        data: { id: 'r1', status: 'RESOLVED', admin_response: 'Fixed' },
        error: null,
      });

      const result = await service.updateStatus('r1', {
        status: 'RESOLVED',
        admin_response: 'Fixed',
      });

      expect(result.status).toBe('RESOLVED');
    });
  });

  describe('remove', () => {
    it('should delete report', async () => {
      qb.eq.mockResolvedValueOnce({ error: null });

      const result = await service.remove('r1');
      expect(result.message).toBe('Report berhasil dihapus');
    });
  });
});
