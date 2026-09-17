import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Unique code per test run
const timestamp = Date.now();
const testCode = `E2E${timestamp.toString().slice(-6)}`;

describe('Promos E2E', () => {
  let adminToken: string;
  let userToken: string;
  let createdPromoId: string;

  beforeAll(async () => {
    // Login sebagai admin
    const adminLogin = await request(BASE_URL)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@titipjus.com',
        password: 'admin123456',
      });

    if (adminLogin.status !== 200) {
      throw new Error(
        `Admin login gagal: ${adminLogin.status} - ${JSON.stringify(adminLogin.body)}`,
      );
    }
    adminToken = adminLogin.body.access_token;

    // Login sebagai customer
    const userLogin = await request(BASE_URL)
      .post('/api/v1/auth/login')
      .send({
        email: 'customer@titipjus.com',
        password: 'customer123',
      });

    if (userLogin.status !== 200) {
      throw new Error(
        `User login gagal: ${userLogin.status} - ${JSON.stringify(userLogin.body)}`,
      );
    }
    userToken = userLogin.body.access_token;
  });

  // ============ CREATE ============
  describe('POST /promos (admin only)', () => {
    it('should reject without token', async () => {
      const res = await request(BASE_URL).post('/api/v1/promos').send({
        code: 'TEST',
        discount_type: 'FIXED',
        discount_value: 5000,
        valid_until: '2030-12-31T23:59:59.000Z',
      });

      expect(res.status).toBe(401);
    });

    it('should create PERCENTAGE promo', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/promos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: `${testCode}50`,
          description: 'Diskon 50% max 10rb',
          discount_type: 'PERCENTAGE',
          discount_value: 50,
          max_discount: 10000,
          min_purchase: 20000,
          quota: 100,
          quota_per_user: 1,
          valid_until: '2030-12-31T23:59:59.000Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.code).toBe(`${testCode}50`.toUpperCase());
      expect(res.body.discount_type).toBe('PERCENTAGE');
      expect(res.body.is_active).toBe(true);

      createdPromoId = res.body.id;
    });

    it('should reject PERCENTAGE > 100', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/promos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: `${testCode}INVALID`,
          discount_type: 'PERCENTAGE',
          discount_value: 150,
          valid_until: '2030-12-31T23:59:59.000Z',
        });

      expect(res.status).toBe(400);
    });

    it('should reject duplicate code', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/promos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: `${testCode}50`, // sama dengan yang tadi
          discount_type: 'FIXED',
          discount_value: 5000,
          valid_until: '2030-12-31T23:59:59.000Z',
        });

      expect(res.status).toBe(409);
    });
  });

  // ============ LIST ============
  describe('GET /promos (admin)', () => {
    it('should return list of promos', async () => {
      const res = await request(BASE_URL)
        .get('/api/v1/promos')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /promos/active (public)', () => {
    it('should return active promos', async () => {
      const res = await request(BASE_URL).get('/api/v1/promos/active');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ============ VALIDATE ============
  describe('POST /promos/validate', () => {
    it('should validate PERCENTAGE promo with max cap', async () => {
      // 50% × 30000 = 15000, tapi cap 10000
      const res = await request(BASE_URL)
        .post('/api/v1/promos/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: `${testCode}50`,
          order_amount: 30000,
        });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.discount_amount).toBe(10000); // cap
      expect(res.body.final_amount).toBe(20000);
    });

    it('should reject below min purchase', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/promos/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: `${testCode}50`,
          order_amount: 15000, // < min_purchase 20000
        });

      expect(res.status).toBe(400);
    });

    it('should reject non-existent code', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/promos/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: 'NGACO123',
          order_amount: 30000,
        });

      expect(res.status).toBe(404);
    });

    it('should reject without token', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/promos/validate')
        .send({
          code: `${testCode}50`,
          order_amount: 30000,
        });

      expect(res.status).toBe(401);
    });
  });

  // ============ TOGGLE ============
  describe('PATCH /promos/:id/toggle (admin)', () => {
    it('should deactivate promo', async () => {
      const res = await request(BASE_URL)
        .patch(`/api/v1/promos/${createdPromoId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_active: false });

      expect(res.status).toBe(200);
      expect(res.body.is_active).toBe(false);
    });

    it('should reject toggling inactive promo validation', async () => {
      // Promo sekarang inactive, validate harus fail
      const res = await request(BASE_URL)
        .post('/api/v1/promos/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: `${testCode}50`,
          order_amount: 30000,
        });

      expect(res.status).toBe(400);
    });
  });
});
