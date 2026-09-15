import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { MidtransService } from './midtrans.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly midtrans: MidtransService,
  ) {}

  /**
   * Buat payment untuk order.
   * Flow:
   * 1. Ambil order + user dari DB
   * 2. Cek order status (harus PENDING_PAYMENT)
   * 3. Cek apakah payment sudah ada
   * 4. Generate Snap token dari Midtrans
   * 5. Simpan payment record
   */
  async create(consumerId: string, dto: CreatePaymentDto) {
    const admin = this.supabase.getAdmin();

    // 1. Ambil order
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('*')
      .eq('id', dto.order_id)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) throw new NotFoundException('Order tidak ditemukan');

    // 2. Validasi: order milik user yang bikin payment
    if (order.consumer_id !== consumerId) {
      throw new BadRequestException('Order ini bukan milik Anda');
    }

    // 3. Validasi status order
    if (order.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException(
        `Order tidak bisa dibayar. Status saat ini: ${order.status}`,
      );
    }

    // 4. Cek apakah payment sudah ada
    const { data: existingPayment } = await admin
      .from('payments')
      .select('*')
      .eq('order_id', dto.order_id)
      .maybeSingle();

    if (existingPayment && existingPayment.status === 'PENDING') {
      // Sudah ada payment pending, return yang itu
      return existingPayment;
    }

    // 5. Ambil data user untuk customer_details
    const { data: userProfile } = await admin
      .from('users')
      .select('*')
      .eq('id', consumerId)
      .maybeSingle();

    const { data: authUser } = await admin.auth.admin.getUserById(consumerId);

    // 6. Generate Midtrans Snap transaction
    const midtransResponse = await this.midtrans.createTransaction({
      id: order.id,
      total: Number(order.total_amount),
      customer: {
        name: userProfile?.full_name ?? 'Customer',
        email: authUser?.user?.email ?? 'customer@example.com',
        phone: userProfile?.phone ?? '08000000000',
      },
    });

    // 7. Simpan payment record
    const { data: payment, error: paymentError } = await admin
      .from('payments')
      .insert({
        order_id: order.id,
        amount: order.total_amount,
        status: 'PENDING',
        midtrans_token: midtransResponse.token,
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    return {
      ...payment,
      redirect_url: midtransResponse.redirect_url,
      token: midtransResponse.token,
    };
  }

  async findAll() {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async findById(id: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('payments')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundException('Payment tidak ditemukan');
    return data;
  }

  async findByOrderId(orderId: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Handle notification dari Midtrans (webhook).
   */
  async handleNotification(notification: any) {
    const statusResponse =
      await this.midtrans.verifyNotification(notification);

    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;

    // Update payment status
    let paymentStatus = 'PENDING';
    if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
      paymentStatus = fraudStatus === 'accept' ? 'PAID' : 'CHALLENGE';
    } else if (transactionStatus === 'deny') {
      paymentStatus = 'FAILED';
    } else if (transactionStatus === 'cancel' || transactionStatus === 'expire') {
      paymentStatus = 'FAILED';
    } else if (transactionStatus === 'pending') {
      paymentStatus = 'PENDING';
    }

    await this.supabase
      .getAdmin()
      .from('payments')
      .update({ status: paymentStatus })
      .eq('order_id', orderId);

    // Update order status kalau paid
    if (paymentStatus === 'PAID') {
      await this.supabase
        .getAdmin()
        .from('orders')
        .update({ status: 'PAID' })
        .eq('id', orderId);
    }

    return { message: 'Notification handled', status: paymentStatus };
  }
}
