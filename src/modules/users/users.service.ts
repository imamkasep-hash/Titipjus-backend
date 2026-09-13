import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';

export interface CreateUserProfileDto {
  id: string;        // dari auth.users.id
  phone: string;
  full_name?: string;
  role?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Cari user profile berdasarkan ID (uuid dari auth.users)
   */
  async findById(id: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Cari user profile berdasarkan phone
   */
  async findByPhone(phone: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('users')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Buat user profile baru setelah register di Supabase Auth
   */
  async createProfile(payload: CreateUserProfileDto) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('users')
      .insert({
        id: payload.id,
        phone: payload.phone,
        full_name: payload.full_name ?? null,
        role: payload.role ?? 'CONSUMER',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update user profile
   */
  async updateProfile(id: string, payload: Partial<CreateUserProfileDto>) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('users')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Ambil semua user (untuk admin)
   */
  async findAll() {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('users')
      .select('id, role, phone, full_name, status, created_at');

    if (error) throw error;
    return data ?? [];
  }

  /**
   * Cek user ada atau tidak, lempar error kalau tidak ada
   */
  async findByIdOrFail(id: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User tidak ditemukan');
    return user;
  }
}
