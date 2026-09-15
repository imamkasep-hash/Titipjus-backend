import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class LedgerService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Buat transaksi double-entry.
   * 1. Validasi wallet from & to
   * 2. Cek saldo wallet from cukup
   * 3. Insert ledger_transaction
   * 4. Update saldo kedua wallet
   */
  async createTransaction(dto: CreateTransactionDto) {
    const admin = this.supabase.getAdmin();

    // 1. Validasi wallet
    if (dto.from_wallet_id === dto.to_wallet_id) {
      throw new BadRequestException('Wallet asal dan tujuan tidak boleh sama');
    }

    // 2. Ambil wallet from & to
    const { data: fromWallet, error: fromError } = await admin
      .from('wallets')
      .select('*')
      .eq('id', dto.from_wallet_id)
      .maybeSingle();

    if (fromError) throw fromError;
    if (!fromWallet) throw new NotFoundException('Wallet asal tidak ditemukan');

    const { data: toWallet, error: toError } = await admin
      .from('wallets')
      .select('*')
      .eq('id', dto.to_wallet_id)
      .maybeSingle();

    if (toError) throw toError;
    if (!toWallet) throw new NotFoundException('Wallet tujuan tidak ditemukan');

    // 3. Cek saldo cukup
    if (Number(fromWallet.balance) < dto.amount) {
      throw new BadRequestException(
        `Saldo tidak cukup. Saldo saat ini: ${fromWallet.balance}, dibutuhkan: ${dto.amount}`,
      );
    }

    // 4. Insert ledger transaction
    const { data: transaction, error: txError } = await admin
      .from('ledger_transactions')
      .insert({
        order_id: dto.order_id,
        from_wallet_id: dto.from_wallet_id,
        to_wallet_id: dto.to_wallet_id,
        amount: dto.amount,
        transaction_type: dto.transaction_type,
        description: dto.description ?? null,
      })
      .select()
      .single();

    if (txError) throw txError;

    // 5. Update saldo kedua wallet (atomik di aplikasi)
    const newFromBalance = Number(fromWallet.balance) - dto.amount;
    const newToBalance = Number(toWallet.balance) + dto.amount;

    const { error: updateFromError } = await admin
      .from('wallets')
      .update({ balance: newFromBalance })
      .eq('id', dto.from_wallet_id);

    if (updateFromError) {
      // Rollback: hapus transaction
      await admin.from('ledger_transactions').delete().eq('id', transaction.id);
      throw updateFromError;
    }

    const { error: updateToError } = await admin
      .from('wallets')
      .update({ balance: newToBalance })
      .eq('id', dto.to_wallet_id);

    if (updateToError) {
      // Rollback: restore saldo from & hapus transaction
      await admin
        .from('wallets')
        .update({ balance: fromWallet.balance })
        .eq('id', dto.from_wallet_id);
      await admin.from('ledger_transactions').delete().eq('id', transaction.id);
      throw updateToError;
    }

    return {
      ...transaction,
      from_wallet_balance: newFromBalance,
      to_wallet_balance: newToBalance,
    };
  }

  /**
   * Ambil semua transaksi.
   */
  async findAll() {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('ledger_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  /**
   * Transaksi by ID.
   */
  async findById(id: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('ledger_transactions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundException('Transaksi tidak ditemukan');
    return data;
  }

  /**
   * Transaksi by order.
   */
  async findByOrderId(orderId: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('ledger_transactions')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  /**
   * Ambil atau buat wallet untuk user.
   */
  async getOrCreateWallet(userId: string, currency = 'IDR') {
    const admin = this.supabase.getAdmin();

    const { data: existing } = await admin
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) return existing;

    const { data, error } = await admin
      .from('wallets')
      .insert({ user_id: userId, balance: 0, currency })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Wallet by user_id.
   */
  async findWalletByUserId(userId: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundException('Wallet tidak ditemukan');
    return data;
  }

  /**
   * Semua wallet (admin only).
   */
  async findAllWallets() {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('wallets')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }
}
