import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.test kalau ada, kalau tidak pakai .env
dotenv.config({
  path: path.resolve(process.cwd(), '.env.test'),
});
dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
});

// Set NODE_ENV
process.env.NODE_ENV = 'test';

// Global test setup
beforeAll(() => {
  console.log('🧪 Test suite starting...');
});

afterAll(() => {
  console.log('✅ Test suite finished.');
});
