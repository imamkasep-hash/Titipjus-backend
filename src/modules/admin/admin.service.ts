import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';

@Injectable()
export class AdminService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Dashboard stats global.
   */
  async getDashboard() {
    const admin = this.supabase.getAdmin();

    const [
      usersCount,
      merchantsCount,
      driversCount,
      ordersCount,
      completedOrders,
      pendingWithdrawals,
      openReports,
      activePromos,
    ] = await Promise.all([
      admin.from('users').select('*', { count: 'exact', head: true }),
      admin.from('merchants').select('*', { count: 'exact', head: true }),
      admin.from('drivers').select('*', { count: 'exact', head: true }),
      admin.from('orders').select('*', { count: 'exact', head: true }),
      admin
        .from('orders')
        .select('total_amount')
        .eq('status', 'COMPLETED'),
      admin
        .from('withdrawals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING'),
      admin
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .in('status', ['OPEN', 'IN_REVIEW']),
      admin
        .from('promos')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true),
    ]);

    const totalRevenue = (completedOrders.data ?? []).reduce(
      (sum, o) => sum + Number(o.total_amount ?? 0),
      0,
    );

    return {
      users: usersCount.count ?? 0,
      merchants: merchantsCount.count ?? 0,
      drivers: driversCount.count ?? 0,
      orders: {
        total: ordersCount.count ?? 0,
        completed: completedOrders.data?.length ?? 0,
        total_revenue: Number(totalRevenue.toFixed(2)),
      },
      pending_withdrawals: pendingWithdrawals.count ?? 0,
      open_reports: openReports.count ?? 0,
      active_promos: activePromos.count ?? 0,
    };
  }

  /**
   * List users dengan filter.
   */
  async listUsers(role?: string, status?: string, limit = 50, offset = 0) {
    const admin = this.supabase.getAdmin();

    let query = admin
      .from('users')
      .select('*', { count: 'exact' });

    if (role) query = query.eq('role', role);
    if (status) query = query.eq('status', status);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      data: data ?? [],
      total: count ?? 0,
      limit,
      offset,
    };
  }

  /**
   * Update user status (ban/unban).
   */
  async updateUserStatus(userId: string, status: string) {
    const admin = this.supabase.getAdmin();

    if (!['ACTIVE', 'SUSPENDED', 'DELETED'].includes(status)) {
      throw new BadRequestException('Status tidak valid');
    }

    const { data, error } = await admin
      .from('users')
      .update({ status })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new NotFoundException('User tidak ditemukan');

    return data;
  }

  /**
   * Update user role.
   */
  async updateUserRole(userId: string, role: string) {
    const admin = this.supabase.getAdmin();

    if (!['CONSUMER', 'DRIVER', 'MERCHANT', 'ADMIN'].includes(role)) {
      throw new BadRequestException('Role tidak valid');
    }

    const { data, error } = await admin
      .from('users')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new NotFoundException('User tidak ditemukan');

    return data;
  }

  /**
   * List semua withdrawals (pending).
   */
  async listWithdrawals(status?: string) {
    const admin = this.supabase.getAdmin();

    let query = admin
      .from('withdrawals')
      .select('*');

    if (status) query = query.eq('status', status);

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) throw error;
    return data ?? [];
  }

  /**
   * Approve/reject withdrawal.
   */
  async processWithdrawal(
    id: string,
    action: 'APPROVED' | 'REJECTED' | 'COMPLETED',
    notes?: string,
  ) {
    const admin = this.supabase.getAdmin();

    const { data: withdrawal } = await admin
      .from('withdrawals')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!withdrawal) throw new NotFoundException('Withdrawal tidak ditemukan');

    // Update withdrawal
    const { data, error } = await admin
      .from('withdrawals')
      .update({
        status: action,
        notes: notes ?? withdrawal.notes,
        processed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Kalau APPROVED/COMPLETED, kurangi saldo wallet
    if (action === 'APPROVED' || action === 'COMPLETED') {
      const { data: wallet } = await admin
        .from('wallets')
        .select('*')
        .eq('user_id', withdrawal.user_id)
        .maybeSingle();

      if (wallet && Number(wallet.balance) >= Number(withdrawal.amount)) {
        const newBalance = Number(wallet.balance) - Number(withdrawal.amount);

        await admin
          .from('wallets')
          .update({ balance: newBalance })
          .eq('id', wallet.id);
      }
    }

    return data;
  }

  /**
   * List merchants (dengan filter).
   */
  async listMerchants(isOpen?: boolean) {
    const admin = this.supabase.getAdmin();

    let query = admin.from('merchants').select('*');
    if (isOpen !== undefined) query = query.eq('is_open', isOpen);

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) throw error;
    return data ?? [];
  }

  /**
   * Force close/open merchant (admin).
   */
  async toggleMerchant(merchantId: string, isOpen: boolean) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('merchants')
      .update({ is_open: isOpen })
      .eq('id', merchantId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
