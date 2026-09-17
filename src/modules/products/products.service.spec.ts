import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { SupabaseService } from '../../database/supabase.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let supabaseMock: any;
  let queryBuilder: any;

  beforeEach(async () => {
    // Query builder mock (untuk chaining Supabase)
    queryBuilder = {
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn(),
      maybeSingle: vi.fn(),
      delete: vi.fn().mockReturnThis(),
    };

    supabaseMock = {
      getAdmin: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue(queryBuilder),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: SupabaseService, useValue: supabaseMock },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============ CREATE ============
  describe('create', () => {
    it('should create a product', async () => {
      const dto = {
        merchant_id: 'merchant-1',
        name: 'Jus Alpukat',
        description: 'Segar',
        price: 15000,
        stock_quantity: 50,
        is_available: true,
      };

      const createdProduct = {
        id: 'product-1',
        ...dto,
        created_at: '2026-01-01',
      };

      queryBuilder.single.mockResolvedValue({
        data: createdProduct,
        error: null,
      });

      const result = await service.create(dto);

      expect(result.id).toBe('product-1');
      expect(result.name).toBe('Jus Alpukat');
      expect(result.price).toBe(15000);
      expect(supabaseMock.getAdmin).toHaveBeenCalled();
    });
  });

  // ============ FIND ALL ============
  describe('findAll', () => {
    it('should return list of products', async () => {
      const products = [
        { id: 'p1', name: 'Jus Alpukat', price: 15000 },
        { id: 'p2', name: 'Jus Mangga', price: 12000 },
      ];

      queryBuilder.order.mockResolvedValue({
        data: products,
        error: null,
      });

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Jus Alpukat');
    });

    it('should return empty array when no products', async () => {
      queryBuilder.order.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // ============ FIND BY ID ============
  describe('findById', () => {
    it('should return product if found', async () => {
      const product = { id: 'p1', name: 'Jus Alpukat' };

      queryBuilder.maybeSingle.mockResolvedValue({
        data: product,
        error: null,
      });

      const result = await service.findById('p1');

      expect(result).toEqual(product);
      expect(result.id).toBe('p1');
    });

    it('should throw NotFoundException if not found', async () => {
      queryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============ FIND BY MERCHANT ============
  describe('findByMerchantId', () => {
    it('should return products of a merchant', async () => {
      const products = [
        { id: 'p1', merchant_id: 'm1', name: 'Jus Alpukat' },
        { id: 'p2', merchant_id: 'm1', name: 'Jus Mangga' },
      ];

      queryBuilder.order.mockResolvedValue({
        data: products,
        error: null,
      });

      const result = await service.findByMerchantId('m1');

      expect(result).toHaveLength(2);
      expect(result[0].merchant_id).toBe('m1');
    });
  });

  // ============ UPDATE ============
  describe('update', () => {
    it('should update product', async () => {
      const updated = { id: 'p1', name: 'Jus Alpukat Super', price: 18000 };

      queryBuilder.single.mockResolvedValue({
        data: updated,
        error: null,
      });

      const result = await service.update('p1', {
        name: 'Jus Alpukat Super',
        price: 18000,
      });

      expect(result.name).toBe('Jus Alpukat Super');
      expect(result.price).toBe(18000);
    });
  });

  // ============ REMOVE ============
  describe('remove', () => {
    it('should delete product and return message', async () => {
      queryBuilder.eq.mockResolvedValue({
        error: null,
      });

      const result = await service.remove('p1');

      expect(result.message).toBe('Produk berhasil dihapus');
    });
  });
});

