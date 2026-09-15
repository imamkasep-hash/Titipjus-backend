import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@Injectable()
export class DriversService {
  constructor(private readonly supabase: SupabaseService) {}

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
}

