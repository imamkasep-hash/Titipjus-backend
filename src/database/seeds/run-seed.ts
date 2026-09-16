import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { seedUsers } from './users.seed';
import { seedMerchants } from './merchants.seed';
import { seedProducts } from './products.seed';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// ============ KEAMANAN: BLOK PRODUCTION ============
if (process.env.NODE_ENV === 'production') {
  console.error('');
  console.error('❌❌❌  SEED TIDAK BOLEH DIJALANKAN DI PRODUCTION!  ❌❌❌');
  console.error('');
  console.error('Seed hanya untuk development & testing.');
  console.error('Kalau Anda yakin, ubah NODE_ENV ke "development" dulu.');
  console.error('');
  process.exit(1);
}
// ====================================================

async function runSeed() {
  console.log('');
  console.log('🌱 ============================================');
  console.log('🌱  TitipJus Database Seeder');
  console.log('🌱 ============================================');
  console.log('');

  // 1. Cek env
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ SUPABASE_URL / SUPABASE_SERVICE_KEY tidak ada di .env');
    process.exit(1);
  }

  console.log(`📦 Target: ${supabaseUrl}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV ?? 'development'}`);
  console.log('');

  // 2. Parse args
  const args = process.argv.slice(2);
  const onlyArg = args.find((a) => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.split('=')[1] : null;

  console.log(`🎯 Mode: ${only ? `Hanya "${only}"` : 'Semua seed'}`);
  console.log('');

  // 3. Init Supabase admin client
  const admin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const startTime = Date.now();

  try {
    // ============ SEED USERS ============
    let userIdMap: Record<string, string> = {};

    if (!only || only === 'users') {
      console.log('👥 [1/3] Seeding users...');
      userIdMap = await seedUsers(admin);
      console.log(`   ✅ ${Object.keys(userIdMap).length} users siap.`);
      console.log('');
    }

    // ============ SEED MERCHANTS ============
    let merchantIds: string[] = [];

    if (!only || only === 'merchants') {
      console.log('🏪 [2/3] Seeding merchants...');
      const merchantOwner =
        userIdMap['merchant@titipjus.com'] ?? '';

      if (!merchantOwner) {
        console.log('⚠️  User merchant tidak ada, skip merchants.');
      } else {
        merchantIds = await seedMerchants(admin, merchantOwner);
        console.log(`   ✅ ${merchantIds.length} merchants siap.`);
      }
      console.log('');
    }

    // ============ SEED PRODUCTS ============
    if (!only || only === 'products') {
      console.log('📦 [3/3] Seeding products...');

      // Kalau `--only=products`, ambil merchant dari DB
      if (only === 'products') {
        const { data: merchants } = await admin
          .from('merchants')
          .select('id')
          .limit(3);
        merchantIds = (merchants ?? []).map((m) => m.id);
      }

      const productIds = await seedProducts(admin, merchantIds);
      console.log(`   ✅ ${productIds.length} products siap.`);
      console.log('');
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('🎉 ============================================');
    console.log(`🎉  Seed selesai dalam ${duration}s`);
    console.log('🎉 ============================================');
    console.log('');
    console.log('📝 Akun demo yang dibuat:');
    console.log('   👑 Admin    : admin@titipjus.com / admin123456');
    console.log('   👤 Customer : customer@titipjus.com / customer123');
    console.log('   🏪 Merchant : merchant@titipjus.com / merchant123');
    console.log('   🚗 Driver   : driver@titipjus.com / driver123');
    console.log('');
    console.log('⚠️  JANGAN pakai password ini di production!');
    console.log('');

    process.exit(0);
  } catch (err) {
    console.error('');
    console.error('❌ Seed gagal:', (err as Error).message);
    console.error((err as Error).stack);
    process.exit(1);
  }
}

runSeed();
