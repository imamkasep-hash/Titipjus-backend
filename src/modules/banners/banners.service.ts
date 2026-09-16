import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

@Injectable()
export class BannersService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(dto: CreateBannerDto) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('banners')
      .insert({
        title: dto.title,
        description: dto.description ?? null,
        image_url: dto.image_url,
        link_url: dto.link_url ?? null,
        position: dto.position ?? 'TOP',
        display_order: dto.display_order ?? 0,
        is_active: dto.is_active ?? true,
        valid_from: dto.valid_from ?? new Date().toISOString(),
        valid_until: dto.valid_until ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async findAll() {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('banners')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async findById(id: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('banners')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundException('Banner tidak ditemukan');
    return data;
  }

  /**
   * List banner aktif (untuk user).
   */
  async findActive(position?: string) {
    const admin = this.supabase.getAdmin();
    const now = new Date().toISOString();

    let query = admin
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .lte('valid_from', now)
      .or(`valid_until.is.null,valid_until.gte.${now}`);

    if (position) {
      query = query.eq('position', position);
    }

    const { data, error } = await query
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async update(id: string, dto: UpdateBannerDto) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('banners')
      .update({
        ...dto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase
      .getAdmin()
      .from('banners')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Banner berhasil dihapus' };
  }

  async toggle(id: string, is_active: boolean) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('banners')
      .update({
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
