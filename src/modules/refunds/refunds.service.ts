import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { LedgerService } from '../ledger/ledger.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateRefundDto } from './dto/create-refund.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';

@Injectable()
export class RefundsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly ledger: LedgerService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /**
   * User request refund manual.
   */
  async createRequest(userId: string, dto: CreateRefundDto) {
    const admin = this.supabase.getAdmin();

    // 1. Ambil order
    const { data: order, error } = await admin
      .from('orders')
      .select('*')
      .eq('id', dto.order_id)
      .maybeSingle();

    if (error) throw error;
    if (!order) throw new NotFoundException('Order tidak ditemukan');

    // 2. Validasi owner
    if (order.consumer_id !== userId) {
      throw new ForbiddenException('Order ini bukan milik Anda');
    }

    // 3. Validasi status (hanya bisa refund kalau PAID atau COMPLETED)
    if (!['PAID', 'COMPLETED', 'CANCELLED'].includes(order.status)) {
      throw new BadRequestException(
        `Order dengan status ${order.status} tidak bisa direfund`,
      );
    }

    // 4. Validasi amount <= total_amount
    if (dto.amount > Number(order.total_amount)) {
      throw new BadRequestException(
        `Amount refund tidak boleh lebih dari total order (${order.total_amount})`,
      );
    }

    // 5. Cek sudah ada refund pending untuk order ini
    const { data: existing } = await admin
      .from('refunds')
      .select('id, status')
      .eq('order_id', dto.order_id)
      .in('status', ['PENDING', 'APPROVED'])
      .maybeSingle();

    if (existing) {
      throw new BadRequestException(
        'Sudah ada refund pending untuk order ini',
      );
    }

    // 6. Insert refund
    const { data: refund, error: insertError } = await admin
      .from('refunds')
      .insert({
        order_id: dto.order_id,
        user_id: userId,
        amount: dto.amount,
        reason: dto.reason,
        status: 'PENDING',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return refund;
  }

  /**
   * Auto-create refund (dipanggil dari OrdersService saat order cancelled setelah PAID).
   */
  async autoCreateRefund(orderId: string) {
    const admin = this.supabase.getAdmin();

    const { data: order } = await admin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (!order) return null;

    // Cek apakah sudah ada refund
    const { data: existing } = await admin
      .from('refunds')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle();

    if (existing) return existing;

    // Bikin refund otomatis
    const { data, error } = await admin
      .from('refunds')
      .insert({
        order_id: orderId,
        user_id: order.consumer_id,
        amount: Number(order.total_amount),
        reason: 'Auto refund: order cancelled',
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) return null;
    return data;
  }

  /**
   * List refund user.
   */
  async findByUser(userId: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('refunds')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  /**
   * List semua refund (admin).
   */
  async findAll(status?: string) {
    let query = this.supabase.getAdmin().from('refunds').select('*');
    if (status) query = query.eq('status', status);

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) throw error;
    return data ?? [];
  }

  /**
   * Detail refund.
   */
  async findById(id: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('refunds')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundException('Refund tidak ditemukan');
    return data;
  }

  /**
   * Admin proses refund (approve/reject/complete).
   */
  async process(
    id: string,
    adminUserId: string,
    dto: ProcessRefundDto,
  ) {
    const admin = this.supabase.getAdmin();

    // 1. Cek refund ada
    const refund = await this.findById(id);

    if (refund.status === 'COMPLETED') {
      throw new BadRequestException('Refund sudah selesai');
    }

    if (refund.status === 'REJECTED' && dto.action !== 'REJECTED') {
      throw new BadRequestException('Refund sudah di-reject');
    }

    // 2. Update refund
    const payload: any = {
      status: dto.action,
      admin_notes: dto.admin_notes ?? refund.admin_notes,
      processed_by: adminUserId,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (dto.action === 'COMPLETED') {
      payload.completed_at = new Date().toISOString();
    }

    const { data, error } = await admin
      .from('refunds')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // 3. Kalau COMPLETED → transfer via ledger ke wallet user
    if (dto.action === 'COMPLETED') {
      await this.transferRefundToUser(refund);
    }

    // 4. Broadcast
    this.realtime.emitToUser(refund.user_id, 'refund_updated', {
      refund_id: id,
      status: dto.action,
      amount: refund.amount,
    });

    return data;
  }

  /**
   * Transfer refund ke wallet user via ledger.
   * Pakai platform wallet sebagai sumber dana.
   */
  private async transferRefundToUser(refund: any) {
    const admin = this.supabase.getAdmin();

    // 1. Ambil/bikin wallet user
    const userWallet = await this.ledger.getOrCreateWallet(refund.user_id);

    // 2. Ambil platform wallet (admin user)
    // Untuk sementara, pakai wallet admin (user_id admin)
    const { data: adminProfile } = await admin
      .from('users')
      .select('id')
      .eq('role', 'ADMIN')
      .limit(1)
      .maybeSingle();

    if (!adminProfile) return;

    const platformWallet = await this.ledger.getOrCreateWallet(
      adminProfile.id,
    );

    // 3. Transfer via ledger
    try {
      await this.ledger.createTransaction({
        order_id: refund.order_id,
        from_wallet_id: platformWallet.id,
        to_wallet_id: userWallet.id,
        amount: Number(refund.amount),
        transaction_type: 'REFUND',
        description: `Refund untuk order ${refund.order_id}`,
      });
    } catch (err) {
      // Log error tapi jangan throw (refund status sudah COMPLETED)
      console.error('Ledger transfer error:', (err as Error).message);
    }
  }

  /**
   * Statistik refund (admin).
   */
  async getStats() {
    const admin = this.supabase.getAdmin();

    const { data: refunds, error } = await admin
      .from('refunds')
      .select('status, amount');

    if (error) throw error;

    const statusCount: Record<string, number> = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      COMPLETED: 0,
    };

    let totalAmount = 0;
    let completedAmount = 0;

    (refunds ?? []).forEach((r) => {
      statusCount[r.status] = (statusCount[r.status] ?? 0) + 1;
      totalAmount += Number(r.amount);
      if (r.status === 'COMPLETED') {
        completedAmount += Number(r.amount);
      }
    });

    return {
      total_refunds: refunds?.length ?? 0,
      total_amount_requested: Number(totalAmount.toFixed(2)),
      total_amount_completed: Number(completedAmount.toFixed(2)),
      by_status: statusCount,
    };
  }
}
