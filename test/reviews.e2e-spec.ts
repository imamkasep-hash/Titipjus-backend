import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Reviews E2E', () => {
  let customerToken: string;

  beforeAll(async () => {
    // 1. Login customer
    const customerLogin = await request(BASE_URL)
      .post('/api/v1/auth/login')
      .send({
        email: 'customer@titipjus.com',
        password: 'customer123',
      });

    if (customerLogin.status !== 200) {
      throw new Error(
        `Customer login gagal: ${customerLogin.status} - ${JSON.stringify(customerLogin.body)}`,
      );
    }
    customerToken = customerLogin.body.access_token;

    // 2. Login merchant
    const merchantLogin = await request(BASE_URL)
      .post('/api/v1/auth/login')
      .send({
        email: 'merchant@titipjus.com',
        password: 'merchant123',
      });

    if (merchantLogin.status !== 200) {
      throw new Error(
        `Merchant login gagal: ${merchantLogin.status}`,
      );
    }
    merchantToken = merchantLogin.body.access_token;

    // 3. Ambil merchant milik user
    const merchantsRes = await request(BASE_URL)
      .get('/api/v1/merchants/me')
      .set('Authorization', `Bearer ${customerToken}`);

    if (merchantsRes.body && merchantsRes.body.length > 0) {
      merchantId = merchantsRes.body[0].id;
    }

    // 4. Ambil order COMPLETED milik customer (kalau ada)
    const ordersRes = await request(BASE_URL)
      .get('/api/v1/orders/me')
      .set('Authorization', `Bearer ${customerToken}`);

    if (ordersRes.status === 200 && Array.isArray(ordersRes.body)) {
      const completed = ordersRes.body.find(
        (o: any) => o.status === 'COMPLETED',
      );
      if (completed) {
        completedOrderId = completed.id;
      }
    }
  });

  // ============ PUBLIC ============
  describe('GET /reviews (public)', () => {
    it('should return reviews for a merchant', async () => {
      // Ambil salah satu merchant
      const merchantsRes = await request(BASE_URL).get('/api/v1/merchants');
      const firstMerchant = merchantsRes.body[0];

      const res = await request(BASE_URL).get(
        `/api/v1/reviews/merchant/${firstMerchant.id}`,
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return reviews for a driver', async () => {
      // Pakai UUID dummy, response harus array kosong
      const res = await request(BASE_URL).get(
        '/api/v1/reviews/driver/00000000-0000-0000-0000-000000000000',
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return summary for a merchant', async () => {
      const merchantsRes = await request(BASE_URL).get('/api/v1/merchants');
      const firstMerchant = merchantsRes.body[0];

      const res = await request(BASE_URL).get(
        `/api/v1/reviews/summary?target_type=merchant&target_id=${firstMerchant.id}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.target_type).toBe('merchant');
      expect(res.body.target_id).toBe(firstMerchant.id);
      expect(res.body.total_reviews).toBeDefined();
      expect(res.body.average_rating).toBeDefined();
      expect(res.body.distribution).toBeDefined();
    });
  });

  // ============ AUTH ============
  describe('GET /reviews/me (auth)', () => {
    it('should reject without token', async () => {
      const res = await request(BASE_URL).get('/api/v1/reviews/me');
      expect(res.status).toBe(401);
    });

    it('should return my reviews', async () => {
      const res = await request(BASE_URL)
        .get('/api/v1/reviews/me')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ============ CREATE ============
  describe('POST /reviews (auth)', () => {
    it('should reject without token', async () => {
      const res = await request(BASE_URL).post('/api/v1/reviews').send({
        order_id: '00000000-0000-0000-0000-000000000000',
        target_type: 'merchant',
        target_id: '00000000-0000-0000-0000-000000000000',
        rating: 5,
      });

      expect(res.status).toBe(401);
    });

    it('should reject invalid rating', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          order_id: '00000000-0000-0000-0000-000000000000',
          target_type: 'merchant',
          target_id: '00000000-0000-0000-0000-000000000000',
          rating: 10, // invalid, harus 1-5
        });

      expect(res.status).toBe(400);
    });

    it('should reject invalid target_type', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          order_id: '00000000-0000-0000-0000-000000000000',
          target_type: 'INVALID_TYPE',
          target_id: '00000000-0000-0000-0000-000000000000',
          rating: 5,
        });

      expect(res.status).toBe(400);
    });

    it('should reject non-existent order', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          order_id: '00000000-0000-0000-0000-000000000000',
          target_type: 'merchant',
          target_id: '00000000-0000-0000-0000-000000000000',
          rating: 5,
          comment: 'Test review',
        });

      expect(res.status).toBe(404);
    });

    it('should reject review for non-completed order (if exists)', async () => {
      // Ambil order yang BUKAN COMPLETED
      const ordersRes = await request(BASE_URL)
        .get('/api/v1/orders/me')
        .set('Authorization', `Bearer ${customerToken}`);

      const nonCompleted = ordersRes.body.find(
        (o: any) => o.status !== 'COMPLETED',
      );

      if (!nonCompleted) {
        console.log('⏭️  Skip: tidak ada order non-COMPLETED');
        return;
      }

      const res = await request(BASE_URL)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          order_id: nonCompleted.id,
          target_type: 'merchant',
          target_id: nonCompleted.merchant_id,
          rating: 5,
          comment: 'Test',
        });

      expect(res.status).toBe(400); // BadRequest karena order belum COMPLETED
    });
  });

  // ============ ORDER REVIEWS ============
  describe('GET /reviews/order/:id (public)', () => {
    it('should return reviews for an order', async () => {
      const res = await request(BASE_URL).get(
        '/api/v1/reviews/order/00000000-0000-0000-0000-000000000000',
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
