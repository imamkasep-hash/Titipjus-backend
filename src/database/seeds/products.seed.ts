import { SupabaseClient } from '@supabase/supabase-js';

export const SEED_PRODUCTS = [
  { name: 'Jus Alpukat', description: 'Jus alpukat segar', price: 15000, stock_quantity: 50 },
  { name: 'Jus Mangga', description: 'Jus mangga manis', price: 12000, stock_quantity: 40 },
  { name: 'Jus Strawberry', description: 'Jus strawberry segar', price: 18000, stock_quantity: 30 },
  { name: 'Jus Jeruk', description: 'Jus jeruk peras', price: 10000, stock_quantity: 60 },
  { name: 'Kopi Hitam', description: 'Kopi hitam tubruk', price: 8000, stock_quantity: 100 },
  { name: 'Kopi Susu', description: 'Kopi susu gula aren', price: 15000, stock_quantity: 80 },
  { name: 'Roti Bakar', description: 'Roti bakar coklat keju', price: 12000, stock_quantity: 50 },
  { name: 'Bakso Urat', description: 'Bakso urat sapi asli', price: 20000, stock_quantity: 40 },
  { name: 'Mie Ayam', description: 'Mie ayam jamur', price: 18000, stock_quantity: 35 },
];

export async function seedProducts(
  admin: SupabaseClient,
  merchantIds: string[],
): Promise<string[]> {
  if (merchantIds.length === 0) {
    console.log('⚠️  Tidak ada merchant, skip produk.');
    return [];
  }

  const productIds: string[] = [];

  const distribution: Record<number, number[]> = {
    0: [0, 1, 2, 3],
    1: [4, 5, 6],
    2: [7, 8],
  };

  for (const [merchantIdx, productIdxs] of Object.entries(distribution)) {
    const merchantId = merchantIds[parseInt(merchantIdx)];
    if (!merchantId) continue;

    for (const pIdx of productIdxs) {
      const p = SEED_PRODUCTS[pIdx];

      const { data: existing } = await admin
        .from('products')
        .select('id')
        .eq('name', p.name)
        .eq('merchant_id', merchantId)
        .maybeSingle();

      if (existing) {
        console.log(`⏭️  Produk ${p.name} sudah ada, skip.`);
        productIds.push(existing.id);
        continue;
      }

      const { data, error } = await admin
        .from('products')
        .insert({
          merchant_id: merchantId,
          name: p.name,
          description: p.description,
          price: p.price,
          stock_quantity: p.stock_quantity,
          is_available: true,
        })
        .select('id')
        .single();

      if (error) {
        console.error(`❌ Gagal buat produk ${p.name}:`, error.message);
        continue;
      }

      productIds.push(data.id);
      console.log(`✅ Produk ${p.name} dibuat.`);
    }
  }

  return productIds;
}
