import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Tambah merchant ke favorite.
   */
  async add(userId: string, merchantId: string) {
    const admin = this.supabase.getAdmin();

    // Cek merchant ada
    const { data: merchant } = await admin
      .from('merchants')
      .select('id, store_name')
      .eq('id', merchantId)
      .maybeSingle();

    if (!merchant) throw new NotFoundException('Merchant tidak ditemukan');

    // Cek sudah di-favorite?
    const { data: existing } = await admin
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('merchant_id', merchantId)
      .maybeSingle();

    if (existing) {
      throw new ConflictException('Merchant sudah ada di favorite');
    }

    // Insert
    const { data, error } = await admin
      .from('favorites')
      .insert({
        user_id: userId,
        merchant_id: merchantId,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      ...data,
      merchant_name: merchant.store_name,
    };
  }

  /**
   * Hapus merchant dari favorite.
   */
  async remove(userId: string, merchantId: string) {
    const { error } = await this.supabase
      .getAdmin()
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('merchant_id', merchantId);

    if (error) throw error;
    return { message: 'Berhasil dihapus dari favorite' };
  }

  /**
   * List favorite user.
   */
  async getMyFavorites(userId: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('favorites')
      .select('*, merchants(id, store_name, description, address, is_open, rating, location)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  /**
   * Cek apakah merchant sudah di-favorite.
   */
  async checkFavorite(userId: string, merchantId: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('merchant_id', merchantId)
      .maybeSingle();

    if (error) throw error;

    return {
      is_favorite: !!data,
      favorite_id: data?.id ?? null,
    };
  }

  /**
   * Toggle favorite.
   */
  async toggle(userId: string, merchantId: string) {
    const check = await this.checkFavorite(userId, merchantId);

    if (check.is_favorite) {
      await this.remove(userId, merchantId);
      return { is_favorite: false, message: 'Dihapus dari favorite' };
    } else {
      await this.add(userId, merchantId);
      return { is_favorite: true, message: 'Ditambahkan ke favorite' };
    }
  }

  /**
   * Count favorite user.
   */
  async getCount(userId: string) {
    const { count, error } = await this.supabase
      .getAdmin()
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw error;
    return { total_favorites: count ?? 0 };
  }
}
