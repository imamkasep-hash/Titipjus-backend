import { SupabaseClient } from '@supabase/supabase-js';

export const SEED_USERS = [
  {
    email: 'admin@titipjus.com',
    password: 'admin123456',
    phone: '081111111111',
    full_name: 'Admin TitipJus',
    role: 'ADMIN',
  },
  {
    email: 'customer@titipjus.com',
    password: 'customer123',
    phone: '082222222222',
    full_name: 'Customer Demo',
    role: 'CONSUMER',
  },
  {
    email: 'merchant@titipjus.com',
    password: 'merchant123',
    phone: '083333333333',
    full_name: 'Merchant Demo',
    role: 'MERCHANT',
  },
  {
    email: 'driver@titipjus.com',
    password: 'driver123',
    phone: '084444444444',
    full_name: 'Driver Demo',
    role: 'DRIVER',
  },
];

export async function seedUsers(
  admin: SupabaseClient,
): Promise<Record<string, string>> {
  const userIdMap: Record<string, string> = {};

  for (const user of SEED_USERS) {
    const { data: existing } = await admin
      .from('users')
      .select('id')
      .eq('phone', user.phone)
      .maybeSingle();

    if (existing) {
      console.log(`⏭️  User ${user.email} sudah ada, skip.`);
      userIdMap[user.email] = existing.id;
      continue;
    }

    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      console.error(`❌ Gagal buat user ${user.email}:`, authError?.message);
      continue;
    }

    const { error: profileError } = await admin.from('users').insert({
      id: authData.user.id,
      phone: user.phone,
      full_name: user.full_name,
      role: user.role,
    });

    if (profileError) {
      console.error(
        `❌ Gagal buat profile ${user.email}:`,
        profileError.message,
      );
      await admin.auth.admin.deleteUser(authData.user.id);
      continue;
    }

    userIdMap[user.email] = authData.user.id;
    console.log(`✅ User ${user.email} dibuat.`);
  }

  return userIdMap;
}
