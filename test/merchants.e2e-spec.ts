import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API = `${BASE_URL}/api/v1`;

describe('Merchants E2E', () => {
  let token: string;
  let createdMerchantId: string;

  beforeAll(async () => {
    // Login sebagai customer
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

    token = loginRes.body.access_token;
  });

  // ============ PUBLIC ============
  describe('GET /merchants (public)', () => {
    it('should return list of merchants', async () => {
      const res = await request(BASE_URL).get('/api/v1/merchants');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /merchants/search (public)', () => {
    it('should return merchants with pagination', async () => {
      const res = await request(BASE_URL).get(
        '/api/v1/merchants/search?limit=5',
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.total).toBeDefined();
      expect(res.body.limit).toBe(5);
    });

    it('should filter by search query', async () => {
      const res = await request(BASE_URL).get(
        '/api/v1/merchants/search?search=jus',
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it('should filter by is_open', async () => {
      const res = await request(BASE_URL).get(
        '/api/v1/merchants/search?is_open=true',
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      // Semua merchant harus is_open: true
      res.body.data.forEach((m: any) => {
        expect(m.is_open).toBe(true);
      });
    });
  });

  // ============ AUTH ============
  describe('POST /merchants (auth)', () => {
    it('should reject without token', async () => {
      const res = await request(BASE_URL).post('/api/v1/merchants').send({
        store_name: 'Test',
        address: 'Test',
        location: [106.8, -6.2],
      });

      expect(res.status).toBe(401);
    });

    it('should reject invalid body', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/merchants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          // store_name missing
          address: 'Test',
        });

      expect(res.status).toBe(400);
    });

    it('should create merchant successfully', async () => {
      const timestamp = Date.now();
      const res = await request(BASE_URL)
        .post('/api/v1/merchants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          store_name: `E2E Store ${timestamp}`,
          description: 'Merchant dari E2E test',
          address: 'Jl. E2E No. 1',
          location: [106.83, -6.21],
          is_open: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.store_name).toContain('E2E Store');
      expect(res.body.is_open).toBe(true);

      createdMerchantId = res.body.id;
    });
  });

  describe('GET /merchants/me (auth)', () => {
    it('should return my merchants', async () => {
      const res = await request(BASE_URL)
        .get('/api/v1/merchants/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /merchants/:id (public)', () => {
    it('should return merchant detail', async () => {
      // Ambil salah satu dari list
      const listRes = await request(BASE_URL).get('/api/v1/merchants');
      const merchantId = listRes.body[0].id;

      const res = await request(BASE_URL).get(
        `/api/v1/merchants/${merchantId}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(merchantId);
    });

    it('should return 404 for non-existent merchant', async () => {
      const res = await request(BASE_URL).get(
        '/api/v1/merchants/00000000-0000-0000-0000-000000000000',
      );

      expect(res.status).toBe(404);
    });
  });

  // ============ STATS ============
  describe('GET /merchants/stats/:id (public)', () => {
    it('should return merchant stats', async () => {
      const listRes = await request(BASE_URL).get('/api/v1/merchants');
      const merchantId = listRes.body[0].id;

      const res = await request(BASE_URL).get(
        `/api/v1/merchants/stats/${merchantId}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.merchant_id).toBe(merchantId);
      expect(res.body.total_orders).toBeDefined();
      expect(res.body.total_revenue).toBeDefined();
      expect(res.body.orders_by_status).toBeDefined();
    });
  });

  // ============ SCHEDULES ============
  describe('Schedules', () => {
    it('should set schedules for a merchant', async () => {
      // Ambil merchant milik user
      const myRes = await request(BASE_URL)
        .get('/api/v1/merchants/me')
        .set('Authorization', `Bearer ${token}`);

      // Kalau belum punya merchant, skip test ini
      if (!myRes.body || myRes.body.length === 0) {
        console.log('⏭️  Skip: user belum punya merchant');
        return;
      }

      const merchantId = myRes.body[0].id;

      const res = await request(BASE_URL)
        .post(`/api/v1/merchants/${merchantId}/schedules`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          schedules: [
            { day_of_week: 1, open_time: '08:00', close_time: '22:00' },
            { day_of_week: 2, open_time: '08:00', close_time: '22:00' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.merchant_id).toBe(merchantId);
      expect(res.body.total_shifts).toBe(2);
    });

    it('should get operating status', async () => {
      const listRes = await request(BASE_URL).get('/api/v1/merchants');
      const merchantId = listRes.body[0].id;

      const res = await request(BASE_URL).get(
        `/api/v1/merchants/${merchantId}/operating-status`,
      );

      expect(res.status).toBe(200);
      expect(res.body.merchant_id).toBe(merchantId);
      expect(res.body.is_open_now).toBeDefined();
      expect(res.body.current_day).toBeDefined();
      expect(res.body.current_time).toBeDefined();
    });
  });
});
