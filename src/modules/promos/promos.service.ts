import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { CreatePromoDto } from './dto/create-promo.dto';
import { ValidatePromoDto } from './dto/validate-promo.dto';

@Injectable()
export class PromosService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Hitung diskon berdasarkan promo & order amount.
   */
  private calculateDiscount(
    promo: any,
    orderAmount: number,
  ): { discount: number; reason?: string } {
    // 1. Cek min purchase
    if (orderAmount < Number(promo.min_purchase ?? 0)) {
      return {
        discount: 0,
        reason: `Minimal belanja Rp ${promo.min_purchase} untuk pakai promo ini`,
      };
    }

    // 2. Hitung diskon
    let discount = 0;

    if (promo.discount_type === 'PERCENTAGE') {
      discount = (orderAmount * Number(promo.discount_value)) / 100;

      // Cap max discount
      if (promo.max_discount && discount > Number(promo.max_discount)) {
        discount = Number(promo.max_discount);
      }
    } else {
      // FIXED
      discount = Number(promo.discount_value);
    }

    // 3. Diskon tidak boleh lebih dari order amount
    if (discount > orderAmount) {
      discount = orderAmount;
    }

    return { discount: Number(discount.toFixed(2)) };
  }

  /**
   * Buat promo baru.
   */
  async create(dto: CreatePromoDto) {
    const admin = this.supabase.getAdmin();

    // Cek code duplikat
    const { data: existing } = await admin
      .from('promos')
      .select('id')
      .eq('code', dto.code.toUpperCase())
      .maybeSingle();

    if (existing) {
      throw new ConflictException('Kode promo sudah ada');
    }

    // Validasi: PERCENTAGE harus <= 100
    if (dto.discount_type === 'PERCENTAGE' && dto.discount_value > 100) {
      throw new BadRequestException('Diskon persentase maksimal 100%');
    }

    const { data, error } = await admin
      .from('promos')
      .insert({
        code: dto.code.toUpperCase(),
        description: dto.description ?? null,
        discount_type: dto.discount_type,
        discount_value: dto.discount_value,
        max_discount: dto.max_discount ?? null,
        min_purchase: dto.min_purchase ?? 0,
        quota: dto.quota ?? null,
        quota_per_user: dto.quota_per_user ?? 1,
        merchant_id: dto.merchant_id ?? null,
        valid_from: dto.valid_from ?? new Date().toISOString(),
        valid_until: dto.valid_until,
        is_active: dto.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * List semua promo.
   */
  async findAll() {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('promos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  /**
   * Detail promo by ID.
   */
  async findById(id: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('promos')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundException('Promo tidak ditemukan');
    return data;
  }

  /**
   * Validasi promo (tanpa apply).
   */
  async validate(userId: string, dto: ValidatePromoDto) {
    const admin = this.supabase.getAdmin();

    // 1. Cari promo by code
    const { data: promo, error } = await admin
      .from('promos')
      .select('*')
      .eq('code', dto.code.toUpperCase())
      .maybeSingle();

    if (error) throw error;
    if (!promo) {
      throw new NotFoundException('Kode promo tidak ditemukan');
    }

    // 2. Cek aktif
    if (!promo.is_active) {
      throw new BadRequestException('Promo sudah tidak aktif');
    }

    // 3. Cek tanggal
    const now = new Date();
    const validFrom = new Date(promo.valid_from);
    const validUntil = new Date(promo.valid_until);

    if (now < validFrom) {
      throw new BadRequestException('Promo belum berlaku');
    }
    if (now > validUntil) {
      throw new BadRequestException('Promo sudah expired');
    }

    // 4. Cek merchant (kalau promo spesifik merchant)
    if (promo.merchant_id) {
      if (!dto.merchant_id || dto.merchant_id !== promo.merchant_id) {
        throw new BadRequestException(
          'Promo hanya berlaku untuk merchant tertentu',
        );
      }
    }

    // 5. Cek quota total
    if (promo.quota) {
      const { count } = await admin
        .from('promo_usages')
        .select('*', { count: 'exact', head: true })
        .eq('promo_id', promo.id);

      if ((count ?? 0) >= promo.quota) {
        throw new BadRequestException('Kuota promo sudah habis');
      }
    }

    // 6. Cek quota per user
    const { count: userUsageCount } = await admin
      .from('promo_usages')
      .select('*', { count: 'exact', head: true })
      .eq('promo_id', promo.id)
      .eq('user_id', userId);

    if ((userUsageCount ?? 0) >= promo.quota_per_user) {
      throw new BadRequestException('Anda sudah memakai promo ini');
    }

    // 7. Hitung diskon
    const result = this.calculateDiscount(promo, dto.order_amount);

    if (result.reason) {
      throw new BadRequestException(result.reason);
    }

    return {
      valid: true,
      promo_id: promo.id,
      code: promo.code,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      discount_amount: result.discount,
      final_amount: Number((dto.order_amount - result.discount).toFixed(2)),
      description: promo.description,
    };
  }

  /**
   * Apply promo (setelah order dibuat).
   * Dipanggil oleh OrdersService setelah order di-insert.
   */
  async apply(
    userId: string,
    code: string,
    orderId: string,
    orderAmount: number,
    merchantId?: string,
  ) {
    const admin = this.supabase.getAdmin();

    // 1. Validasi
    const validation = await this.validate(userId, {
      code,
      order_amount: orderAmount,
      merchant_id: merchantId,
    });

    // 2. Insert usage
    const { data: usage, error } = await admin
      .from('promo_usages')
      .insert({
        promo_id: validation.promo_id,
        user_id: userId,
        order_id: orderId,
        discount_amount: validation.discount_amount,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      ...usage,
      code: validation.code,
      discount_amount: validation.discount_amount,
    };
  }

  /**
   * Riwayat pemakaian promo user.
   */
  async getMyUsages(userId: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('promo_usages')
      .select('*, promos(code, description, discount_type, discount_value)')
      .eq('user_id', userId)
      .order('used_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  /**
   * List semua promo yang aktif & valid (untuk ditampilkan ke user).
   */
  async findActive() {
    const admin = this.supabase.getAdmin();
    const now = new Date().toISOString();

    const { data, error } = await admin
      .from('promos')
      .select('*')
      .eq('is_active', true)
      .lte('valid_from', now)
      .gte('valid_until', now)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  /**
   * Toggle aktif / nonaktif promo.
   */
  async toggle(id: string, is_active: boolean) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('promos')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Hapus promo.
   */
  async remove(id: string) {
    const { error } = await this.supabase
      .getAdmin()
      .from('promos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Promo berhasil dihapus' };
  }
}
