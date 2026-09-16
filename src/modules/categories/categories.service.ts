import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(dto: CreateCategoryDto) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('categories')
      .insert({
        merchant_id: dto.merchant_id,
        name: dto.name,
        description: dto.description ?? null,
        display_order: dto.display_order ?? 0,
        is_active: dto.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async findAll() {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async findById(id: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('categories')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundException('Kategori tidak ditemukan');
    return data;
  }

  async findByMerchant(merchantId: string, activeOnly = false) {
    let query = this.supabase
      .getAdmin()
      .from('categories')
      .select('*')
      .eq('merchant_id', merchantId);

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('categories')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase
      .getAdmin()
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Kategori berhasil dihapus' };
  }

  /**
   * Hitung jumlah produk per kategori.
   */
  async getCategoryStats(categoryId: string) {
    const admin = this.supabase.getAdmin();

    const { count, error } = await admin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', categoryId);

    if (error) throw error;

    return { category_id: categoryId, product_count: count ?? 0 };
  }
}
