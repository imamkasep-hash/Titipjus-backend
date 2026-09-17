import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API = `${BASE_URL}/api/v1`;

// Unique email per test run biar tidak bentrok
const timestamp = Date.now();
const testEmail = `e2e-test-${timestamp}@titipjus.com`;
const testPassword = 'passwordE2E123';
const testPhone = `0899${timestamp.toString().slice(-8)}`;

describe('Auth E2E', () => {
  let accessToken: string;

  describe('POST /auth/register', () => {
    it('should reject invalid email', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'password123',
          phone: '08123456789',
          full_name: 'Test',
        });

      expect(res.status).toBe(400);
    });

    it('should reject short password', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/auth/register')
        .send({
          email: 'short@mail.com',
          password: '123',
          phone: '08123456789',
          full_name: 'Test',
        });

      expect(res.status).toBe(400);
    });

    it('should reject invalid phone', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@mail.com',
          password: 'password123',
          phone: 'abc',
          full_name: 'Test',
        });

      expect(res.status).toBe(400);
    });

    it('should register new user successfully', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          phone: testPhone,
          full_name: 'E2E Test User',
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Registrasi berhasil');
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testEmail);
      expect(res.body.user.phone).toBe(testPhone);
      expect(res.body.user.role).toBe('CONSUMER');
      expect(res.body.user.status).toBe('ACTIVE');
    });

    it('should reject duplicate email', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail, // sama dengan test di atas
          password: testPassword,
          phone: `0898${timestamp.toString().slice(-8)}`,
          full_name: 'Duplicate',
        });

      expect(res.status).toBe(409); // Conflict
    });
  });

  describe('POST /auth/login', () => {
    it('should reject non-existent email', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/auth/login')
        .send({
          email: 'nobody@nowhere.com',
          password: 'password123',
        });

      expect(res.status).toBe(401);
    });

    it('should reject wrong password', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'WRONG-PASSWORD',
        });

      expect(res.status).toBe(401);
    });

    it('should login successfully with correct credentials', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.access_token).toBeDefined();
      expect(res.body.refresh_token).toBeDefined();
      expect(res.body.user.email).toBe(testEmail);
      expect(res.body.user.role).toBe('CONSUMER');

      // Simpan token untuk test berikutnya
      accessToken = res.body.access_token;
    });
  });

  describe('Protected routes', () => {
    it('should reject /users/me without token', async () => {
      const res = await request(BASE_URL).get('/api/v1/users/me');
      expect(res.status).toBe(401);
    });

    it('should reject /users/me with invalid token', async () => {
      const res = await request(BASE_URL)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid-token-xyz');

      expect(res.status).toBe(401);
    });

    it('should reject malformed Authorization header', async () => {
      const res = await request(BASE_URL)
        .get('/api/v1/users/me')
        .set('Authorization', 'NotBearer xyz');

      expect(res.status).toBe(401);
    });

    it('should allow /users/me with valid token', async () => {
      const res = await request(BASE_URL)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      // Response bisa berupa profile atau req.user
      expect(res.body).toBeDefined();
    });

    it('should allow /users with valid token', async () => {
      const res = await request(BASE_URL)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
    });

    it('should reject /admin/dashboard for non-admin', async () => {
      const res = await request(BASE_URL)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${accessToken}`);

      // 403 Forbidden karena role CONSUMER
      expect(res.status).toBe(403);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([200, 201]).toContain(res.status);
    });
  });
});
