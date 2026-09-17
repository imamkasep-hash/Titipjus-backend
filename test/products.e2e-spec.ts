import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Products E2E', () => {
  let customerToken: string;
  let merchantId: string;
  let createdProductId: string;

  beforeAll(async () => {
    // 1. Login customer
    const loginRes = await request(BASE_URL)
      .post('/api/v1/auth/login')
      .send({
        email: 'customer@titipjus.com',
        password: 'customer123',
      });

    if (loginRes.status !== 200) {
      throw new Error(
        `Login gagal: ${loginRes.status} - ${JSON.stringify(loginRes.body)}`,
      );
    }
    customerToken = loginRes.body.access_token;

    // 2. Ambil salah satu merchant
    const merchantsRes = await request(BASE_URL).get('/api/v1/merchants');
    if (merchantsRes.status !== 200 || !merchantsRes.body.length) {
      throw new Error('Tidak ada merchant untuk test');
    }
    merchantId = merchantsRes.body[0].id;
  });

  // ============ PUBLIC ============
  describe('GET /products (public)', () => {
    it('should return list of products', async () => {
      const res = await request(BASE_URL).get('/api/v1/products');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /products/search (public)', () => {
    it('should return products with pagination', async () => {
      const res = await request(BASE_URL).get(
        '/api/v1/products/search?limit=5',
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.total).toBeDefined();
      expect(res.body.limit).toBe(5);
      expect(res.body.offset).toBe(0);
      expect(res.body.has_more).toBeDefined();
    });

    it('should filter by search query', async () => {
      const res = await request(BASE_URL).get(
        '/api/v1/products/search?search=jus',
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it('should filter by merchant_id', async () => {
      const res = await request(BASE_URL).get(
        `/api/v1/products/search?merchant_id=${merchantId}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();

      // Semua hasil harus dari merchant tersebut
      res.body.data.forEach((p: any) => {
        expect(p.merchant_id).toBe(merchantId);
      });
    });

    it('should filter by price range', async () => {
      const res = await request(BASE_URL).get(
        '/api/v1/products/search?min_price=10000&max_price=20000',
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();

      // Semua hasil harus dalam range
      res.body.data.forEach((p: any) => {
        const price = Number(p.price);
        expect(price).toBeGreaterThanOrEqual(10000);
        expect(price).toBeLessThanOrEqual(20000);
      });
    });

    it('should filter by is_available', async () => {
      const res = await request(BASE_URL).get(
        '/api/v1/products/search?is_available=true',
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();

      res.body.data.forEach((p: any) => {
        expect(p.is_available).toBe(true);
      });
    });

    it('should sort by price ascending', async () => {
      const res = await request(BASE_URL).get(
        '/api/v1/products/search?sort_by=price&sort_order=asc&limit=5',
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();

      // Verifikasi urutan harga naik
      if (res.body.data.length >= 2) {
        const prices = res.body.data.map((p: any) => Number(p.price));
        const sorted = [...prices].sort((a, b) => a - b);
        expect(prices).toEqual(sorted);
      }
    });
  });

  describe('GET /products/merchant/:merchantId (public)', () => {
    it('should return products of a merchant', async () => {
      const res = await request(BASE_URL).get(
        `/api/v1/products/merchant/${merchantId}`,
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /products/:id (public)', () => {
    it('should return product detail', async () => {
      const listRes = await request(BASE_URL).get('/api/v1/products');
      const productId = listRes.body[0].id;

      const res = await request(BASE_URL).get(
        `/api/v1/products/${productId}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(productId);
    });

    it('should return 404 for non-existent product', async () => {
      const res = await request(BASE_URL).get(
        '/api/v1/products/00000000-0000-0000-0000-000000000000',
      );

      expect(res.status).toBe(404);
    });
  });

  // ============ AUTH ============
  describe('POST /products (auth)', () => {
    it('should reject without token', async () => {
      const res = await request(BASE_URL).post('/api/v1/products').send({
        merchant_id: merchantId,
        name: 'Test',
        price: 10000,
      });

      expect(res.status).toBe(401);
    });

    it('should reject invalid body (missing name)', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          merchant_id: merchantId,
          price: 10000,
          // name missing
        });

      expect(res.status).toBe(400);
    });

    it('should reject negative price', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          merchant_id: merchantId,
          name: 'E2E Test Product',
          price: -1000,
        });

      expect(res.status).toBe(400);
    });

    it('should create product successfully', async () => {
      const timestamp = Date.now();
      const res = await request(BASE_URL)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          merchant_id: merchantId,
          name: `E2E Product ${timestamp}`,
          description: 'Produk dari E2E test',
          price: 12000,
          stock_quantity: 20,
          is_available: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toContain('E2E Product');
      expect(Number(res.body.price)).toBe(12000);

      createdProductId = res.body.id;
    });
  });

  // ============ UPDATE ============
  describe('PATCH /products/:id (auth)', () => {
    it('should reject without token', async () => {
      const res = await request(BASE_URL)
        .patch(`/api/v1/products/${createdProductId}`)
        .send({ price: 20000 });

      expect(res.status).toBe(401);
    });

    it('should update product successfully', async () => {
      const res = await request(BASE_URL)
        .patch(`/api/v1/products/${createdProductId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          price: 20000,
          description: 'Harga sudah diupdate',
        });

      expect(res.status).toBe(200);
      expect(Number(res.body.price)).toBe(20000);
      expect(res.body.description).toBe('Harga sudah diupdate');
    });
  });

  // ============ DELETE ============
  describe('DELETE /products/:id (auth)', () => {
    it('should reject without token', async () => {
      const res = await request(BASE_URL).delete(
        `/api/v1/products/${createdProductId}`,
      );

      expect(res.status).toBe(401);
    });

    it('should delete product successfully', async () => {
      const res = await request(BASE_URL)
        .delete(`/api/v1/products/${createdProductId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect([200, 204]).toContain(res.status);
    });

    it('should return 404 when fetching deleted product', async () => {
      const res = await request(BASE_URL).get(
        `/api/v1/products/${createdProductId}`,
      );

      expect(res.status).toBe(404);
    });
  });
});
