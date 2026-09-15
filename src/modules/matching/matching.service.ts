import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';

@Injectable()
export class MatchingService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Cari driver terdekat untuk sebuah order.
   * 1. Ambil order + merchant
   * 2. Panggil RPC find_nearby_drivers
   * 3. Return list driver terdekat (sorted by distance)
   */
  async findDriversForOrder(orderId: string, radiusKm = 5) {
    const admin = this.supabase.getAdmin();

    // 1. Ambil order + merchant
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('*, merchants(*)')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) throw new NotFoundException('Order tidak ditemukan');

    // 2. Validasi status order
    if (order.status !== 'PAID' && order.status !== 'SEARCHING_DRIVER') {
      throw new BadRequestException(
        `Order harus dalam status PAID atau SEARCHING_DRIVER. Status saat ini: ${order.status}`,
      );
    }

    // 3. Ambil koordinat merchant (dari PostGIS)
    // PostGIS POINT format: POINT(longitude latitude)
    const merchant = order.merchants as any;
    if (!merchant?.location) {
      throw new BadRequestException('Merchant tidak punya lokasi');
    }

    // Parse POINT dari PostGIS (raw string)
    // Kalau location bertipe string "POINT(lng lat)" atau sudah object
        const { data: merchantLocation } = await admin.rpc('get_merchant_coords', {
      merchant_id: merchant.id,
    }).maybeSingle();

    const loc = merchantLocation as { lng: number; lat: number } | null;

    // Fallback: pakai default Jakarta
    const lng = loc?.lng ?? 106.8456;
    const lat = loc?.lat ?? -6.2088;

    // 4. Panggil RPC find_nearby_drivers
    const { data: drivers, error: rpcError } = await admin.rpc(
      'find_nearby_drivers',
      {
        order_lng: lng,
        order_lat: lat,
        radius_km: radiusKm,
      },
    );

    if (rpcError) throw rpcError;

    return {
      order_id: orderId,
      merchant_location: { lng, lat },
      radius_km: radiusKm,
      drivers_found: drivers?.length ?? 0,
      drivers: drivers ?? [],
    };
  }

  /**
   * Auto-assign driver terdekat ke order.
   * 1. Cari driver terdekat
   * 2. Assign driver pertama
   * 3. Update order status → SEARCHING_DRIVER
   * 4. Update driver is_busy = true
   */
  async assignDriver(orderId: string, radiusKm = 5) {
    const admin = this.supabase.getAdmin();

    // 1. Cari driver
    const result = await this.findDriversForOrder(orderId, radiusKm);

    if (!result.drivers || result.drivers.length === 0) {
      throw new BadRequestException(
        `Tidak ada driver dalam radius ${radiusKm} km`,
      );
    }

    const driver = result.drivers[0];

    // 2. Update order: set driver_id + status
    const { data: updatedOrder, error: orderError } = await admin
      .from('orders')
      .update({
        driver_id: driver.id,
        status: 'SEARCHING_DRIVER',
      })
      .eq('id', orderId)
      .select()
      .single();

    if (orderError) throw orderError;

    // 3. Update driver: set is_busy = true
    const { error: driverError } = await admin
      .from('drivers')
      .update({ is_busy: true })
      .eq('id', driver.id);

    if (driverError) throw driverError;

    return {
      message: 'Driver berhasil di-assign',
      order: updatedOrder,
      driver: {
        id: driver.id,
        vehicle_type: driver.vehicle_type,
        vehicle_plate: driver.vehicle_plate,
        distance_km: driver.distance_km,
      },
    };
  }

  /**
   * Driver accept order.
   */
  async acceptOrder(orderId: string, driverUserId: string) {
    const admin = this.supabase.getAdmin();

    // 1. Cari driver by user_id
    const { data: driver, error: driverError } = await admin
      .from('drivers')
      .select('*')
      .eq('user_id', driverUserId)
      .maybeSingle();

    if (driverError) throw driverError;
    if (!driver) throw new NotFoundException('Driver tidak ditemukan');

    // 2. Ambil order
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) throw new NotFoundException('Order tidak ditemukan');

    // 3. Validasi: order di-assign ke driver ini
    if (order.driver_id !== driver.id) {
      throw new BadRequestException('Order ini bukan untuk Anda');
    }

    // 4. Validasi status
    if (order.status !== 'SEARCHING_DRIVER') {
      throw new BadRequestException(
        `Order tidak bisa di-accept. Status: ${order.status}`,
      );
    }

    // 5. Update order: ACCEPTED_BY_DRIVER
    const { data: updatedOrder, error: updateError } = await admin
      .from('orders')
      .update({ status: 'ACCEPTED_BY_DRIVER' })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) throw updateError;

    return {
      message: 'Order berhasil di-accept',
      order: updatedOrder,
    };
  }

  /**
   * Driver reject order.
   * Reset driver_id, coba cari driver lain.
   */
  async rejectOrder(orderId: string, driverUserId: string) {
    const admin = this.supabase.getAdmin();

    const { data: driver } = await admin
      .from('drivers')
      .select('*')
      .eq('user_id', driverUserId)
      .maybeSingle();

    if (!driver) throw new NotFoundException('Driver tidak ditemukan');

    const { data: order } = await admin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (!order) throw new NotFoundException('Order tidak ditemukan');

    if (order.driver_id !== driver.id) {
      throw new BadRequestException('Order ini bukan untuk Anda');
    }

    // Reset driver_id, set driver free
    await admin
      .from('orders')
      .update({ driver_id: null, status: 'PAID' })
      .eq('id', orderId);

    await admin
      .from('drivers')
      .update({ is_busy: false })
      .eq('id', driver.id);

    return { message: 'Order di-reject. Silakan cari driver lain.' };
  }
}
