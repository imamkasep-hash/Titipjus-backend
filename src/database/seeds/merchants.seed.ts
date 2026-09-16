import { SupabaseClient } from '@supabase/supabase-js';

export const SEED_MERCHANTS = [
  {
    store_name: 'Toko Jus Segar',
    description: 'Aneka jus buah segar setiap hari',
    address: 'Jl. Merdeka No. 1, Jakarta',
    location: 'POINT(106.8456 -6.2088)',
    is_open: true,
  },
  {
    store_name: 'Warung Kopi Mantap',
    description: 'Kopi & snack untuk semua',
    address: 'Jl. Sudirman No. 5, Jakarta',
    location: 'POINT(106.8228 -6.2088)',
    is_open: true,
  },
  {
    store_name: 'Bakso Pak Kumis',
    description: 'Bakso urat spesial',
    address: 'Jl. Thamrin No. 10, Jakarta',
    location: 'POINT(106.8271 -6.1944)',
    is_open: false,
  },
];

export async function seedMerchants(
  admin: SupabaseClient,
  ownerUserId: string,
): Promise<string[]> {
  const merchantIds: string[] = [];

  for (const m of SEED_MERCHANTS) {
    const { data: existing } = await admin
      .from('merchants')
      .select('id')
      .eq('store_name', m.store_name)
      .maybeSingle();

    if (existing) {
      console.log(`⏭️  Merchant ${m.store_name} sudah ada, skip.`);
      merchantIds.push(existing.id);
      continue;
    }

    const { data, error } = await admin
      .from('merchants')
      .insert({
        user_id: ownerUserId,
        store_name: m.store_name,
        description: m.description,
        address: m.address,
        location: m.location,
        is_open: m.is_open,
      })
      .select('id')
      .single();

    if (error) {
      console.error(`❌ Gagal buat merchant ${m.store_name}:`, error.message);
      continue;
    }

    merchantIds.push(data.id);
    console.log(`✅ Merchant ${m.store_name} dibuat.`);
  }

  return merchantIds;
}
