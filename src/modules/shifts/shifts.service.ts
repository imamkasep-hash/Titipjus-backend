import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { CreateShiftDto } from './dto/create-shift.dto';

@Injectable()
export class ShiftsService {
  constructor(private readonly supabase: SupabaseService) {}

  // ============ ZONES ============

  /**
   * Buat zone baru (admin).
   */
  async createZone(dto: CreateZoneDto) {
    const admin = this.supabase.getAdmin();

    // Validasi polygon closed (titik pertama = titik terakhir)
    const coords = dto.coordinates;
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      throw new BadRequestException(
        'Polygon harus closed: titik pertama harus sama dengan titik terakhir',
      );
    }

    // Bikin WKT POLYGON string
    const wkt = `POLYGON((${coords.map((c) => `${c[0]} ${c[1]}`).join(', ')}))`;

    const { data, error } = await admin
      .from('zones')
      .insert({
        name: dto.name,
        description: dto.description ?? null,
        area: wkt,
        is_active: dto.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async findAllZones(activeOnly = false) {
    let query = this.supabase
      .getAdmin()
      .from('zones')
      .select('*');

    if (activeOnly) query = query.eq('is_active', true);

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) throw error;
    return data ?? [];
  }

  async findZoneById(id: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('zones')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundException('Zone tidak ditemukan');
    return data;
  }

  async removeZone(id: string) {
    const { error } = await this.supabase
      .getAdmin()
      .from('zones')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Zone berhasil dihapus' };
  }

  /**
   * Cari zone yang cover koordinat tertentu.
   */
  async findZoneByPoint(lng: number, lat: number) {
    const admin = this.supabase.getAdmin();

    const { data, error } = await admin
      .from('zones')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    // Filter manual pakai PostGIS via RPC
    const { data: zones } = await admin.rpc('find_zone_by_point', {
      point_lng: lng,
      point_lat: lat,
    });

    return zones ?? [];
  }

  // ============ SHIFTS ============

  /**
   * Driver daftar shift baru.
   */
  async createShift(driverUserId: string, dto: CreateShiftDto) {
    const admin = this.supabase.getAdmin();

    // Cari driver
    const { data: driver } = await admin
      .from('drivers')
      .select('id')
      .eq('user_id', driverUserId)
      .maybeSingle();

    if (!driver) throw new NotFoundException('Driver tidak ditemukan');

    // Validasi zone ada
    await this.findZoneById(dto.zone_id);

    // Validasi end > start
    if (dto.end_time <= dto.start_time) {
      throw new BadRequestException('end_time harus lebih besar dari start_time');
    }

    // Cek overlap shift di hari yang sama
    const { data: existing } = await admin
      .from('driver_shifts')
      .select('*')
      .eq('driver_id', driver.id)
      .eq('day_of_week', dto.day_of_week)
      .eq('is_active', true);

    const overlap = (existing ?? []).find((s) => {
      return !(dto.end_time <= s.start_time || dto.start_time >= s.end_time);
    });

    if (overlap) {
      throw new BadRequestException(
        `Shift overlap dengan shift ${overlap.start_time}-${overlap.end_time}`,
      );
    }

    // Insert
    const { data, error } = await admin
      .from('driver_shifts')
      .insert({
        driver_id: driver.id,
        zone_id: dto.zone_id,
        day_of_week: dto.day_of_week,
        start_time: dto.start_time,
        end_time: dto.end_time,
        is_active: dto.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * List shift driver.
   */
  async findMyShifts(driverUserId: string) {
    const admin = this.supabase.getAdmin();

    const { data: driver } = await admin
      .from('drivers')
      .select('id')
      .eq('user_id', driverUserId)
      .maybeSingle();

    if (!driver) throw new NotFoundException('Driver tidak ditemukan');

    const { data, error } = await admin
      .from('driver_shifts')
      .select('*, zones(id, name, description)')
      .eq('driver_id', driver.id)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  /**
   * Hapus shift.
   */
  async removeShift(driverUserId: string, shiftId: string) {
    const admin = this.supabase.getAdmin();

    const { data: driver } = await admin
      .from('drivers')
      .select('id')
      .eq('user_id', driverUserId)
      .maybeSingle();

    if (!driver) throw new NotFoundException('Driver tidak ditemukan');

    const { error } = await admin
      .from('driver_shifts')
      .delete()
      .eq('id', shiftId)
      .eq('driver_id', driver.id);

    if (error) throw error;
    return { message: 'Shift berhasil dihapus' };
  }

  /**
   * Cek apakah driver sedang dalam shift sekarang.
   */
  async checkCurrentShift(driverUserId: string, timezone = 'Asia/Jakarta') {
    const admin = this.supabase.getAdmin();

    const { data: driver } = await admin
      .from('drivers')
      .select('id')
      .eq('user_id', driverUserId)
      .maybeSingle();

    if (!driver) throw new NotFoundException('Driver tidak ditemukan');

    // Ambil shift hari ini
    const now = new Date();
    const timeInTz = now.toLocaleString('en-US', {
      timeZone: timezone,
      hour12: false,
    });
    const parts = timeInTz.split(', ');
    const datePart = parts[0].split('/');
    const timePart = parts[1].split(':');

    const dayOfWeek = new Date(
      parseInt(datePart[2]),
      parseInt(datePart[0]) - 1,
      parseInt(datePart[1]),
    ).getDay();

    const currentTime = `${timePart[0]}:${timePart[1]}:00`;

    const { data: shifts } = await admin
      .from('driver_shifts')
      .select('*, zones(id, name)')
      .eq('driver_id', driver.id)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true);

    const activeShift = (shifts ?? []).find(
      (s) => currentTime >= s.start_time && currentTime < s.end_time,
    );

    return {
      driver_id: driver.id,
      current_day: dayOfWeek,
      current_time: currentTime.substring(0, 5),
      is_on_shift: !!activeShift,
      active_shift: activeShift ?? null,
      all_shifts_today: shifts ?? [],
    };
  }

  /**
   * Cari driver yang sedang shift di zone tertentu (untuk matching).
   */
  async findDriversOnShift(zoneId: string) {
    const admin = this.supabase.getAdmin();

    const now = new Date();
    const timeInTz = now.toLocaleString('en-US', {
      timeZone: 'Asia/Jakarta',
      hour12: false,
    });
    const parts = timeInTz.split(', ');
    const datePart = parts[0].split('/');
    const timePart = parts[1].split(':');

    const dayOfWeek = new Date(
      parseInt(datePart[2]),
      parseInt(datePart[0]) - 1,
      parseInt(datePart[1]),
    ).getDay();

    const currentTime = `${timePart[0]}:${timePart[1]}:00`;

    const { data, error } = await admin
      .from('driver_shifts')
      .select('driver_id, drivers(id, user_id, is_online, is_busy)')
      .eq('zone_id', zoneId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)
      .lte('start_time', currentTime)
      .gt('end_time', currentTime);

    if (error) throw error;
    return data ?? [];
  }
}
