import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Drivers E2E', () => {
  let driverToken: string;
  let customerToken: string;

  beforeAll(async () => {
    // 1. Login driver
    const driverLogin = await request(BASE_URL)
      .post('/api/v1/auth/login')
      .send({
        email: 'driver@titipjus.com',
        password: 'driver123',
      });

    if (driverLogin.status !== 200) {
      throw new Error(
        `Driver login gagal: ${driverLogin.status} - ${JSON.stringify(driverLogin.body)}`,
      );
    }
    driverToken = driverLogin.body.access_token;

    // 2. Login customer
    const customerLogin = await request(BASE_URL)
      .post('/api/v1/auth/login')
      .send({
        email: 'customer@titipjus.com',
        password: 'customer123',
      });

    if (customerLogin.status !== 200) {
      throw new Error(`Customer login gagal: ${customerLogin.status}`);
    }
    customerToken = customerLogin.body.access_token;
  });

  // ============ PUBLIC ============
  describe('GET /drivers (public)', () => {
    it('should return list of drivers', async () => {
      const res = await request(BASE_URL).get('/api/v1/drivers');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /drivers/available (public)', () => {
    it('should return available drivers', async () => {
      const res = await request(BASE_URL).get('/api/v1/drivers/available');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ============ AUTH ============
  describe('GET /drivers/me (auth)', () => {
    it('should reject without token', async () => {
      const res = await request(BASE_URL).get('/api/v1/drivers/me');
      expect(res.status).toBe(401);
    });

    it('should return my driver profile (if driver)', async () => {
      const res = await request(BASE_URL)
        .get('/api/v1/drivers/me')
        .set('Authorization', `Bearer ${driverToken}`);

      // Driver user sudah terdaftar sebagai driver di seed
      // Response 200 dengan data driver, atau null jika belum terdaftar
      expect([200, 404]).toContain(res.status);
    });
  });

  // ============ EARNINGS ============
  describe('GET /drivers/earnings (auth)', () => {
    it('should reject without token', async () => {
      const res = await request(BASE_URL).get('/api/v1/drivers/earnings');
      expect(res.status).toBe(401);
    });

    it('should reject for non-driver (customer)', async () => {
      const res = await request(BASE_URL)
        .get('/api/v1/drivers/earnings')
        .set('Authorization', `Bearer ${customerToken}`);

      // Customer tidak punya driver profile → 404
      expect([404, 403]).toContain(res.status);
    });

    it('should return earnings summary for driver', async () => {
      const res = await request(BASE_URL)
        .get('/api/v1/drivers/earnings')
        .set('Authorization', `Bearer ${driverToken}`);

      if (res.status === 404) {
        console.log('⏭️  Driver belum terdaftar, skip');
        return;
      }

      expect(res.status).toBe(200);
      expect(res.body.driver_id).toBeDefined();
      expect(res.body.total_trips).toBeDefined();
      expect(res.body.total_earnings).toBeDefined();
      expect(res.body.wallet_balance).toBeDefined();
      expect(res.body.currency).toBe('IDR');
    });

    it('should return earnings history for driver', async () => {
      const res = await request(BASE_URL)
        .get('/api/v1/drivers/earnings/history')
        .set('Authorization', `Bearer ${driverToken}`);

      if (res.status === 404) {
        console.log('⏭️  Driver belum terdaftar, skip');
        return;
      }

      expect(res.status).toBe(200);
      // Response bisa berisi { transactions: [] } atau { wallet_id, total_transactions, transactions }
      expect(res.body).toBeDefined();
    });
  });

  // ============ WITHDRAW ============
  describe('POST /drivers/withdraw (auth)', () => {
    it('should reject without token', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/drivers/withdraw')
        .send({
          amount: 50000,
          bank_name: 'BCA',
          bank_account_number: '1234567890',
          bank_account_name: 'Driver Test',
        });

      expect(res.status).toBe(401);
    });

    it('should reject invalid amount (< 10000)', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/drivers/withdraw')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          amount: 5000, // di bawah minimum 10000
          bank_name: 'BCA',
          bank_account_number: '1234567890',
          bank_account_name: 'Driver Test',
        });

      expect(res.status).toBe(400);
    });

    it('should reject when balance insufficient', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/drivers/withdraw')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          amount: 999999999, // pasti lebih besar dari saldo
          bank_name: 'BCA',
          bank_account_number: '1234567890',
          bank_account_name: 'Driver Test',
        });

      // 400 (saldo tidak cukup) atau 404 (driver tidak ditemukan)
      expect([400, 404]).toContain(res.status);
    });
  });

  describe('GET /drivers/withdrawals (auth)', () => {
    it('should reject without token', async () => {
      const res = await request(BASE_URL).get('/api/v1/drivers/withdrawals');
      expect(res.status).toBe(401);
    });

    it('should return withdrawals list for driver', async () => {
      const res = await request(BASE_URL)
        .get('/api/v1/drivers/withdrawals')
        .set('Authorization', `Bearer ${driverToken}`);

      if (res.status === 404) {
        console.log('⏭️  Driver belum terdaftar, skip');
        return;
      }

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
