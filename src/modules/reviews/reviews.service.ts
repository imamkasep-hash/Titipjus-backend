import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Buat review baru.
   * Validasi:
   * 1. Order ada & status COMPLETED
   * 2. User adalah consumer order
   * 3. Target valid (merchant/driver yang terlibat di order)
   * 4. Belum pernah review order+target ini
   */
  async create(reviewerId: string, dto: CreateReviewDto) {
    const admin = this.supabase.getAdmin();

    // 1. Ambil order
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('*')
      .eq('id', dto.order_id)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) throw new NotFoundException('Order tidak ditemukan');

    // 2. Validasi: user adalah consumer
    if (order.consumer_id !== reviewerId) {
      throw new BadRequestException('Anda bukan pemilik order ini');
    }

    // 3. Validasi: order sudah COMPLETED
    if (order.status !== 'COMPLETED') {
      throw new BadRequestException(
        `Order harus COMPLETED dulu. Status saat ini: ${order.status}`,
      );
    }

    // 4. Validasi target
    if (dto.target_type === 'merchant') {
      if (order.merchant_id !== dto.target_id) {
        throw new BadRequestException(
          'Merchant ini bukan merchant di order Anda',
        );
      }
    } else if (dto.target_type === 'driver') {
      if (!order.driver_id || order.driver_id !== dto.target_id) {
        throw new BadRequestException(
          'Driver ini bukan driver di order Anda',
        );
      }
    }

    // 5. Cek duplikat
    const { data: existing } = await admin
      .from('reviews')
      .select('id')
      .eq('order_id', dto.order_id)
      .eq('target_type', dto.target_type)
      .maybeSingle();

    if (existing) {
      throw new ConflictException(
        `Anda sudah review ${dto.target_type} untuk order ini`,
      );
    }

    // 6. Insert review
    const { data: review, error: insertError } = await admin
      .from('reviews')
      .insert({
        order_id: dto.order_id,
        reviewer_id: reviewerId,
        target_type: dto.target_type,
        target_id: dto.target_id,
        rating: dto.rating,
        comment: dto.comment ?? null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 7. Update avg rating (untuk merchant)
    if (dto.target_type === 'merchant') {
      await this.updateMerchantRating(dto.target_id);
    }

    return review;
  }

  /**
   * Update avg rating merchant.
   */
  private async updateMerchantRating(merchantId: string) {
    const admin = this.supabase.getAdmin();

    const { data: reviews } = await admin
      .from('reviews')
      .select('rating')
      .eq('target_type', 'merchant')
      .eq('target_id', merchantId);

    if (!reviews || reviews.length === 0) return;

    const avg =
      reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length;

    await admin
      .from('merchants')
      .update({ rating: Number(avg.toFixed(1)) })
      .eq('id', merchantId);
  }

  /**
   * Ambil review per target (merchant/driver).
   */
  async findByTarget(targetType: string, targetId: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('reviews')
      .select('*')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  /**
   * Ambil review per order.
   */
  async findByOrder(orderId: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('reviews')
      .select('*')
      .eq('order_id', orderId);

    if (error) throw error;
    return data ?? [];
  }

  /**
   * Ambil review yang saya tulis.
   */
  async findByReviewer(reviewerId: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('reviews')
      .select('*')
      .eq('reviewer_id', reviewerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  /**
   * Ringkasan rating merchant/driver.
   */
  async getRatingSummary(targetType: string, targetId: string) {
    const admin = this.supabase.getAdmin();

    const { data: reviews, error } = await admin
      .from('reviews')
      .select('rating')
      .eq('target_type', targetType)
      .eq('target_id', targetId);

    if (error) throw error;

    if (!reviews || reviews.length === 0) {
      return {
        target_type: targetType,
        target_id: targetId,
        total_reviews: 0,
        average_rating: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const distribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    reviews.forEach((r) => {
      distribution[Number(r.rating)]++;
    });

    const avg =
      reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length;

    return {
      target_type: targetType,
      target_id: targetId,
      total_reviews: reviews.length,
      average_rating: Number(avg.toFixed(2)),
      distribution,
    };
  }
}
