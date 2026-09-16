import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';

@Injectable()
export class MerchantsService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Buat merchant baru
   */
  async create(userId: string, dto: CreateMerchantDto) {
    const [longitude, latitude] = dto.location;

    const { data, error } = await this.supabase
      .getAdmin()
      .from('merchants')
      .insert({
        user_id: userId,
        store_name: dto.store_name,
        description: dto.description ?? null,
        address: dto.address,
        location: `POINT(${longitude} ${latitude})`,
        is_open: dto.is_open ?? false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Ambil semua merchant
   */
  async findAll() {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('merchants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  /**
   * Ambil detail merchant by ID
   */
  async findById(id: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('merchants')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundException('Merchant tidak ditemukan');
    return data;
  }

  /**
   * Ambil merchant milik user tertentu
   */
  async findByUserId(userId: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('merchants')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data ?? [];
  }

  /**
   * Update merchant
   */
  async update(id: string, dto: UpdateMerchantDto) {
    const payload: any = { ...dto };

    if (dto.location) {
      const [longitude, latitude] = dto.location;
      payload.location = `POINT(${longitude} ${latitude})`;
    }

    const { data, error } = await this.supabase
      .getAdmin()
      .from('merchants')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Hapus merchant
   */
  async remove(id: string) {
    const { error } = await this.supabase
      .getAdmin()
      .from('merchants')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Merchant berhasil dihapus' };
  }

  /**
   * Cari merchant terdekat (dalam radius km)
   * Pakai PostGIS — perlu RPC function atau query raw
   */
  async findNearby(latitude: number, longitude: number, radiusKm = 5) {
    // Pakai RPC function di Supabase (kita buat nanti)
    // Untuk sekarang, return semua merchant
    const { data, error } = await this.supabase
      .getAdmin()
      .from('merchants')
      .select('*')
      .eq('is_open', true);

    if (error) throw error;
    return data ?? [];
  }
  /**
   * Statistik merchant: total order, revenue, produk terjual.
   */
  async getStats(merchantId: string) {
    const admin = this.supabase.getAdmin();

    // 1. Total order by status
    const { data: orders, error: ordersError } = await admin
      .from('orders')
      .select('id, status, total_amount, created_at')
      .eq('merchant_id', merchantId);

    if (ordersError) throw ordersError;

    const totalOrders = orders?.length ?? 0;

    const statusCount: Record<string, number> = {
      PENDING_PAYMENT: 0,
      PAID: 0,
      SEARCHING_DRIVER: 0,
      ACCEPTED_BY_DRIVER: 0,
      PREPARING: 0,
      READY_FOR_PICKUP: 0,
      PICKED_UP: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };

    let totalRevenue = 0;
    let completedOrders = 0;

    (orders ?? []).forEach((o) => {
      statusCount[o.status] = (statusCount[o.status] ?? 0) + 1;
      if (o.status === 'COMPLETED') {
        totalRevenue += Number(o.total_amount);
        completedOrders++;
      }
    });

    // 2. Total produk terjual (dari order_items order COMPLETED)
    const completedOrderIds = (orders ?? [])
      .filter((o) => o.status === 'COMPLETED')
      .map((o) => o.id);

    let totalProductsSold = 0;
    if (completedOrderIds.length > 0) {
      const { data: items, error: itemsError } = await admin
        .from('order_items')
        .select('quantity')
        .in('order_id', completedOrderIds);

      if (itemsError) throw itemsError;
      totalProductsSold = (items ?? []).reduce(
        (sum, i) => sum + Number(i.quantity),
        0,
      );
    }

    // 3. Average order value
    const avgOrderValue =
      completedOrders > 0 ? totalRevenue / completedOrders : 0;

    return {
      merchant_id: merchantId,
      total_orders: totalOrders,
      completed_orders: completedOrders,
      total_revenue: Number(totalRevenue.toFixed(2)),
      total_products_sold: totalProductsSold,
      average_order_value: Number(avgOrderValue.toFixed(2)),
      orders_by_status: statusCount,
    };
  }

  /**
   * Top products terlaris.
   */
  async getTopProducts(merchantId: string, limit = 10) {
    const admin = this.supabase.getAdmin();

    // 1. Ambil order COMPLETED untuk merchant
    const { data: orders, error: ordersError } = await admin
      .from('orders')
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('status', 'COMPLETED');

    if (ordersError) throw ordersError;

    const orderIds = (orders ?? []).map((o) => o.id);

    if (orderIds.length === 0) {
      return { merchant_id: merchantId, top_products: [] };
    }

    // 2. Ambil order items
    const { data: items, error: itemsError } = await admin
      .from('order_items')
      .select('product_id, quantity, unit_price, subtotal')
      .in('order_id', orderIds);

    if (itemsError) throw itemsError;

    // 3. Group by product_id
    const productMap = new Map<
      string,
      { product_id: string; total_qty: number; total_revenue: number }
    >();

    (items ?? []).forEach((item) => {
      const existing = productMap.get(item.product_id);
      if (existing) {
        existing.total_qty += Number(item.quantity);
        existing.total_revenue += Number(item.subtotal);
      } else {
        productMap.set(item.product_id, {
          product_id: item.product_id,
          total_qty: Number(item.quantity),
          total_revenue: Number(item.subtotal),
        });
      }
    });

    // 4. Sort & limit
    const sorted = Array.from(productMap.values())
      .sort((a, b) => b.total_qty - a.total_qty)
      .slice(0, limit);

    // 5. Ambil detail produk
    const productIds = sorted.map((p) => p.product_id);
    const { data: products } = await admin
      .from('products')
      .select('id, name, price, image_url')
      .in('id', productIds);

    const productMap2 = new Map((products ?? []).map((p) => [p.id, p]));

    return {
      merchant_id: merchantId,
      top_products: sorted.map((s) => ({
        ...s,
        total_revenue: Number(s.total_revenue.toFixed(2)),
        name: productMap2.get(s.product_id)?.name ?? 'Unknown',
        price: productMap2.get(s.product_id)?.price ?? 0,
        image_url: productMap2.get(s.product_id)?.image_url ?? null,
      })),
    };
  }

  /**
   * Revenue per hari (N hari terakhir).
   */
  async getRevenueByDate(merchantId: string, days = 7) {
    const admin = this.supabase.getAdmin();

    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data: orders, error } = await admin
      .from('orders')
      .select('total_amount, created_at')
      .eq('merchant_id', merchantId)
      .eq('status', 'COMPLETED')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group by date
    const dateMap = new Map<string, { revenue: number; orders: number }>();

    // Init all days
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dateMap.set(key, { revenue: 0, orders: 0 });
    }

    (orders ?? []).forEach((o) => {
      const key = o.created_at.split('T')[0];
      const existing = dateMap.get(key);
      if (existing) {
        existing.revenue += Number(o.total_amount);
        existing.orders += 1;
      }
    });

    const result = Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        revenue: Number(data.revenue.toFixed(2)),
        orders: data.orders,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      merchant_id: merchantId,
      days,
      data: result,
    };
  }
}
