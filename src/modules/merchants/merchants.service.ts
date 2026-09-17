import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { SetScheduleDto } from './dto/set-schedule.dto';
import { SearchMerchantDto } from './dto/search-merchant.dto';

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
  async findNearby(_latitude: number, _longitude: number, _radiusKm = 5) {
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
  /**
   * Search & filter merchants.
   */
  async search(dto: SearchMerchantDto) {
    const admin = this.supabase.getAdmin();

    let query = admin.from('merchants').select('*', { count: 'exact' });

    // Search by store_name (case-insensitive)
    if (dto.search) {
      query = query.ilike('store_name', `%${dto.search}%`);
    }

    // Filter is_open
    if (dto.is_open !== undefined) {
      query = query.eq('is_open', dto.is_open);
    }

    // Filter rating
    if (dto.min_rating !== undefined) {
      query = query.gte('rating', dto.min_rating);
    }

    // Sort
    const sortBy = dto.sort_by ?? 'created_at';
    const sortOrder = dto.sort_order ?? 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Pagination
    const limit = dto.limit ?? 20;
    const offset = dto.offset ?? 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data ?? [],
      total: count ?? 0,
      limit,
      offset,
      has_more: (count ?? 0) > offset + limit,
    };
  }
  /**
   * Set jadwal operasional merchant (replace semua).
   */
  async setSchedules(merchantId: string, dto: SetScheduleDto) {
    const admin = this.supabase.getAdmin();

    // Validasi merchant
    const merchant = await this.findById(merchantId);
    if (!merchant) throw new NotFoundException('Merchant tidak ditemukan');

    // Validasi: close_time > open_time
    for (const s of dto.schedules) {
      if (s.close_time <= s.open_time) {
        throw new BadRequestException(
          `Hari ${s.day_of_week}: close_time harus lebih besar dari open_time`,
        );
      }
    }

    // Hapus semua schedule lama
    await admin
      .from('merchant_schedules')
      .delete()
      .eq('merchant_id', merchantId);

    // Insert baru
    const payload = dto.schedules.map((s) => ({
      merchant_id: merchantId,
      day_of_week: s.day_of_week,
      open_time: s.open_time,
      close_time: s.close_time,
      is_active: s.is_active ?? true,
    }));

    if (payload.length > 0) {
      const { error } = await admin
        .from('merchant_schedules')
        .insert(payload);

      if (error) throw error;
    }

    return this.getSchedules(merchantId);
  }

  /**
   * Ambil semua jadwal merchant.
   */
  async getSchedules(merchantId: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('merchant_schedules')
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('is_active', true)
      .order('day_of_week', { ascending: true })
      .order('open_time', { ascending: true });

    if (error) throw error;

    // Group by day_of_week
    const grouped: Record<number, any[]> = {};
    (data ?? []).forEach((s) => {
      if (!grouped[s.day_of_week]) grouped[s.day_of_week] = [];
      grouped[s.day_of_week].push({
        id: s.id,
        open_time: s.open_time,
        close_time: s.close_time,
      });
    });

    return {
      merchant_id: merchantId,
      schedules: grouped,
      total_shifts: data?.length ?? 0,
    };
  }

  /**
   * Cek apakah merchant sedang buka sekarang.
   */
  async getOperatingStatus(merchantId: string, timezone = 'Asia/Jakarta') {
    const admin = this.supabase.getAdmin();

    const { data, error } = await admin
      .from('merchant_schedules')
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('is_active', true);

    if (error) throw error;

    // Waktu sekarang di timezone merchant
    const now = new Date();
    const timeInTz = now.toLocaleString('en-US', {
      timeZone: timezone,
      hour12: false,
    });

    // Parse: "09/16/2026, 13:13:00"
    const parts = timeInTz.split(', ');
    const datePart = parts[0].split('/'); // [MM, DD, YYYY]
    const timePart = parts[1].split(':'); // [HH, MM, SS]

    const dayOfWeek = new Date(
      parseInt(datePart[2]),
      parseInt(datePart[0]) - 1,
      parseInt(datePart[1]),
    ).getDay();

    const currentTime = `${timePart[0]}:${timePart[1]}:00`; // HH:MM:SS

    // Cek apakah ada schedule yang cocok
    const matchingShifts = (data ?? []).filter(
      (s) =>
        s.day_of_week === dayOfWeek &&
        currentTime >= s.open_time &&
        currentTime < s.close_time,
    );

    const isOpen = matchingShifts.length > 0;

    return {
      merchant_id: merchantId,
      is_open_now: isOpen,
      current_day: dayOfWeek,
      current_time: currentTime.substring(0, 5),
      timezone,
      matching_shifts: matchingShifts,
      all_schedules_today: (data ?? []).filter(
        (s) => s.day_of_week === dayOfWeek,
      ),
    };
  }

  /**
   * Update jadwal 1 hari tertentu.
   */
  async updateScheduleDay(
    merchantId: string,
    dayOfWeek: number,
    shifts: { open_time: string; close_time: string }[],
  ) {
    const admin = this.supabase.getAdmin();

    // Hapus schedule lama untuk hari itu
    await admin
      .from('merchant_schedules')
      .delete()
      .eq('merchant_id', merchantId)
      .eq('day_of_week', dayOfWeek);

    // Insert baru
    if (shifts.length > 0) {
      const payload = shifts.map((s) => ({
        merchant_id: merchantId,
        day_of_week: dayOfWeek,
        open_time: s.open_time,
        close_time: s.close_time,
        is_active: true,
      }));

      const { error } = await admin
        .from('merchant_schedules')
        .insert(payload);

      if (error) throw error;
    }

    return this.getSchedules(merchantId);
  }
}
