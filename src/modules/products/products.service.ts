import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

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
}
