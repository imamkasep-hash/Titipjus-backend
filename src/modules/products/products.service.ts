import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductDto } from './dto/search-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(dto: CreateProductDto) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('products')
      .insert({
        merchant_id: dto.merchant_id,
        name: dto.name,
        description: dto.description ?? null,
        price: dto.price,
        stock_quantity: dto.stock_quantity ?? 0,
        is_available: dto.is_available ?? true,
        image_url: dto.image_url ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async findAll() {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async findById(id: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundException('Produk tidak ditemukan');
    return data;
  }

  async findByMerchantId(merchantId: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('products')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async update(id: string, dto: UpdateProductDto) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('products')
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
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Produk berhasil dihapus' };
  }
  /**
   * Search & filter products.
   */
  async search(dto: SearchProductDto) {
    const admin = this.supabase.getAdmin();

    let query = admin.from('products').select('*', { count: 'exact' });

    // Search by name (case-insensitive)
    if (dto.search) {
      query = query.ilike('name', `%${dto.search}%`);
    }

    // Filter merchant
    if (dto.merchant_id) {
      query = query.eq('merchant_id', dto.merchant_id);
    }

    // Filter price range
    if (dto.min_price !== undefined) {
      query = query.gte('price', dto.min_price);
    }
    if (dto.max_price !== undefined) {
      query = query.lte('price', dto.max_price);
    }

    // Filter availability
    if (dto.is_available !== undefined) {
      query = query.eq('is_available', dto.is_available);
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
}
