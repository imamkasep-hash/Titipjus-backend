import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class DriversService {
    constructor(
    private readonly supabase: SupabaseService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async create(userId: string, dto: CreateDriverDto) {
    const payload: any = {
      user_id: userId,
      vehicle_type: dto.vehicle_type ?? null,
      vehicle_plate: dto.vehicle_plate ?? null,
      is_online: false,
      is_busy: false,
    };

    if (dto.current_location) {
      const [longitude, latitude] = dto.current_location;
      payload.current_location = `POINT(${longitude} ${latitude})`;
    }

    const { data, error } = await this.supabase
      .getAdmin()
      .from('drivers')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async findAll() {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('drivers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async findById(id: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('drivers')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundException('Driver tidak ditemukan');
    return data;
  }

  async findByUserId(userId: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('drivers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Cari driver yang sedang online & tidak busy.
   */
  async findAvailable() {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('drivers')
      .select('*')
      .eq('is_online', true)
      .eq('is_busy', false);

    if (error) throw error;
    return data ?? [];
  }

  async update(id: string, dto: UpdateDriverDto) {
    const payload: any = { ...dto };

    if (dto.current_location) {
      const [longitude, latitude] = dto.current_location;
      payload.current_location = `POINT(${longitude} ${latitude})`;
    }

    // Update heartbeat kalau update lokasi/online
    if (dto.current_location || dto.is_online !== undefined) {
      payload.last_heartbeat = new Date().toISOString();
    }

    const { data, error } = await this.supabase
      .getAdmin()
      .from('drivers')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase
      .getAdmin()
      .from('drivers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Driver berhasil dihapus' };
  }
  /**
   * Update lokasi GPS driver + broadcast ke order yang aktif.
   */
  async updateLocation(driverUserId: string, dto: UpdateLocationDto) {
    const admin = this.supabase.getAdmin();

    // 1. Cari driver by user_id
    const { data: driver, error: driverError } = await admin
      .from('drivers')
      .select('*')
      .eq('user_id', driverUserId)
      .maybeSingle();

    if (driverError) throw driverError;
    if (!driver) throw new NotFoundException('Driver tidak ditemukan');

    // 2. Update lokasi + heartbeat
    const [longitude, latitude] = dto.location;
    const { data: updated, error: updateError } = await admin
      .from('drivers')
      .update({
        current_location: `POINT(${longitude} ${latitude})`,
        last_heartbeat: new Date().toISOString(),
      })
      .eq('id', driver.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // 3. Cari order aktif driver ini (status = ACCEPTED_BY_DRIVER, PREPARING, READY_FOR_PICKUP, PICKED_UP)
    const { data: activeOrders } = await admin
      .from('orders')
      .select('id, consumer_id, status')
      .eq('driver_id', driver.id)
      .in('status', [
        'ACCEPTED_BY_DRIVER',
        'PREPARING',
        'READY_FOR_PICKUP',
        'PICKED_UP',
      ]);

    // 4. Broadcast lokasi ke room order masing-masing
    if (activeOrders && activeOrders.length > 0) {
      for (const order of activeOrders) {
        // Ke room order
        this.realtime.emitToOrder(order.id, 'driver_location', {
          order_id: order.id,
          driver_id: driver.id,
          location: { lng: longitude, lat: latitude },
          timestamp: new Date().toISOString(),
        });

        // Ke consumer
        this.realtime.emitToUser(order.consumer_id, 'driver_location', {
          order_id: order.id,
          driver_id: driver.id,
          location: { lng: longitude, lat: latitude },
          timestamp: new Date().toISOString(),
        });
      }
    }

    return {
      message: 'Lokasi berhasil di-update',
      driver_id: driver.id,
      location: { lng: longitude, lat: latitude },
      active_orders: activeOrders?.length ?? 0,
    };
  }

  /**
   * Ambil lokasi driver by ID.
   */
  async getDriverLocation(driverId: string) {
    const admin = this.supabase.getAdmin();

    // Ambil koordinat via RPC
    const { data: coords, error } = await admin
      .rpc('get_driver_coords', { driver_id: driverId })
      .maybeSingle();

    if (error) throw error;

    const loc = coords as { lng: number; lat: number } | null;

    const { data: driver } = await admin
      .from('drivers')
      .select('id, is_online, is_busy, last_heartbeat')
      .eq('id', driverId)
      .maybeSingle();

    if (!driver) throw new NotFoundException('Driver tidak ditemukan');

    return {
      ...driver,
      location: loc ? { lng: loc.lng, lat: loc.lat } : null,
    };
  }
}

