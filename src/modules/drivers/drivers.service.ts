import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { WithdrawDto } from './dto/withdraw.dto';
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
    const { data: _updated, error: updateError } = await admin
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
  /**
   * Earnings summary driver: total trip, total earning, avg per trip.
   */
  async getEarningsSummary(driverUserId: string) {
    const admin = this.supabase.getAdmin();

    // 1. Cari driver
    const { data: driver, error: driverError } = await admin
      .from('drivers')
      .select('id, user_id')
      .eq('user_id', driverUserId)
      .maybeSingle();

    if (driverError) throw driverError;
    if (!driver) throw new NotFoundException('Driver tidak ditemukan');

    // 2. Ambil orders COMPLETED dengan driver ini
    const { data: orders, error: ordersError } = await admin
      .from('orders')
      .select('id, delivery_fee, total_amount, created_at')
      .eq('driver_id', driver.id)
      .eq('status', 'COMPLETED');

    if (ordersError) throw ordersError;

    const totalTrips = orders?.length ?? 0;
    const totalEarnings = (orders ?? []).reduce(
      (sum, o) => sum + Number(o.delivery_fee ?? 0),
      0,
    );

    // 3. Wallet balance
    const { data: wallet } = await admin
      .from('wallets')
      .select('id, balance, currency')
      .eq('user_id', driverUserId)
      .maybeSingle();

    return {
      driver_id: driver.id,
      total_trips: totalTrips,
      total_earnings: Number(totalEarnings.toFixed(2)),
      average_per_trip:
        totalTrips > 0
          ? Number((totalEarnings / totalTrips).toFixed(2))
          : 0,
      wallet_balance: Number(wallet?.balance ?? 0),
      currency: wallet?.currency ?? 'IDR',
    };
  }

  /**
   * History earnings driver (dari ledger transactions).
   */
  async getEarningsHistory(driverUserId: string, limit = 50) {
    const admin = this.supabase.getAdmin();

    // 1. Ambil wallet
    const { data: wallet, error: walletError } = await admin
      .from('wallets')
      .select('id')
      .eq('user_id', driverUserId)
      .maybeSingle();

    if (walletError) throw walletError;
    if (!wallet) return { transactions: [] };

    // 2. Ambil ledger transactions yang masuk ke wallet ini
    const { data: transactions, error } = await admin
      .from('ledger_transactions')
      .select('*')
      .eq('to_wallet_id', wallet.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      wallet_id: wallet.id,
      total_transactions: transactions?.length ?? 0,
      transactions: transactions ?? [],
    };
  }

  /**
   * Request penarikan saldo.
   */
  async requestWithdraw(driverUserId: string, dto: WithdrawDto) {
    const admin = this.supabase.getAdmin();

    // 1. Ambil wallet
    const { data: wallet, error: walletError } = await admin
      .from('wallets')
      .select('*')
      .eq('user_id', driverUserId)
      .maybeSingle();

    if (walletError) throw walletError;
    if (!wallet) throw new NotFoundException('Wallet tidak ditemukan');

    // 2. Cek saldo cukup
    if (Number(wallet.balance) < dto.amount) {
      throw new BadRequestException(
        `Saldo tidak cukup. Saldo: ${wallet.balance}, dibutuhkan: ${dto.amount}`,
      );
    }

    // 3. Cek apakah ada withdrawal PENDING
    const { data: existingPending } = await admin
      .from('withdrawals')
      .select('id')
      .eq('user_id', driverUserId)
      .eq('status', 'PENDING')
      .maybeSingle();

    if (existingPending) {
      throw new BadRequestException(
        'Anda masih punya request penarikan yang PENDING',
      );
    }

    // 4. Insert withdrawal
    const { data: withdrawal, error: insertError } = await admin
      .from('withdrawals')
      .insert({
        user_id: driverUserId,
        amount: dto.amount,
        bank_name: dto.bank_name,
        bank_account_number: dto.bank_account_number,
        bank_account_name: dto.bank_account_name,
        notes: dto.notes ?? null,
        status: 'PENDING',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return {
      ...withdrawal,
      message: 'Request penarikan berhasil dibuat, menunggu approval admin',
    };
  }

  /**
   * List semua withdrawal driver.
   */
  async getWithdrawals(driverUserId: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('withdrawals')
      .select('*')
      .eq('user_id', driverUserId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }
}

