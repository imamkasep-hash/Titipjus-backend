import { describe, it, expect, beforeAll } from 'vitest';import request from 'supertest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Orders E2E', () => {
  let token: string;
  let merchantId: string;
  let productId: string;

  beforeAll(async () => {
    // 1. Login sebagai customer
    const loginRes = await request(BASE_URL)
      .post('/api/v1/auth/login')
      .send({
        email: 'customer@titipjus.com',
        password: 'customer123',
      });

    expect(loginRes.status).toBe(200);
    token = loginRes.body.access_token;
    expect(token).toBeDefined();

    // 2. Ambil merchant & product untuk test

    // 2. Ambil SEMUA merchants, cari yang punya produk
    const merchantsRes = await request(BASE_URL).get('/api/v1/merchants');
    expect(merchantsRes.status).toBe(200);
    expect(merchantsRes.body.length).toBeGreaterThan(0);

    // Loop merchant sampai ketemu yang punya produk
    let found = false;
    for (const m of merchantsRes.body) {
      const productsRes = await request(BASE_URL).get(
        `/api/v1/products/merchant/${m.id}`,
      );

      if (productsRes.status === 200 && productsRes.body.length > 0) {
        merchantId = m.id;
        productId = productsRes.body[0].id;
        found = true;
        break;
      }
    }

    if (!found) {
      throw new Error('Tidak ada merchant yang punya produk untuk test');
    }
    const productsRes = await request(BASE_URL).get(
      `/api/v1/products/merchant/${merchantId}`,
    );
    expect(productsRes.status).toBe(200);
    expect(productsRes.body.length).toBeGreaterThan(0);

    productId = productsRes.body[0].id;
  });

  it('should get health check (public)', async () => {
    const res = await request(BASE_URL).get('/api/v1/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('alive');
  });

  it('should reject login with wrong password', async () => {
    const res = await request(BASE_URL)
      .post('/api/v1/auth/login')
      .send({
        email: 'customer@titipjus.com',
        password: 'WRONG-PASSWORD',
      });

    expect(res.status).toBe(401);
  });

  it('should reject /orders/me without token', async () => {
    const res = await request(BASE_URL).get('/api/v1/orders/me');
    expect(res.status).toBe(401);
  });

  it('should get my orders (with token)', async () => {
    const res = await request(BASE_URL)
      .get('/api/v1/orders/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should create an order', async () => {
    const res = await request(BASE_URL)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        merchant_id: merchantId,
        items: [{ product_id: productId, quantity: 1 }],
        delivery_address: 'Jl. E2E Test No. 1',
        delivery_location: [106.82, -6.21],
        notes: 'E2E test order',
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('PENDING_PAYMENT');
    expect(res.body.total_amount).toBeDefined();
  });

  it('should list merchants (public)', async () => {
    const res = await request(BASE_URL).get('/api/v1/merchants');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should list products (public)', async () => {
    const res = await request(BASE_URL).get('/api/v1/products');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
