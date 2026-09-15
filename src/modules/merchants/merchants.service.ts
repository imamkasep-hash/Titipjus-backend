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
}
