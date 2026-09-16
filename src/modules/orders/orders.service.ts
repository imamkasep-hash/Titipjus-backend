import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  OrderStateMachine,
  OrderStatus,
} from './state-machine/order-state.machine';
import { CancelOrderDto } from './dto/cancel-order.dto';
@Injectable()
export class OrdersService {
    constructor(
    private readonly supabase: SupabaseService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /**
   * Buat order baru.
   * Hitung total dari harga produk × qty.
   */
  async create(consumerId: string, dto: CreateOrderDto) {
    const admin = this.supabase.getAdmin();

    // 1. Ambil produk-produk yang dipesan
    const productIds = dto.items.map((i) => i.product_id);
    const { data: products, error: productError } = await admin
      .from('products')
      .select('id, price, merchant_id')
      .in('id', productIds);

    if (productError) throw productError;
    if (!products || products.length !== productIds.length) {
      throw new BadRequestException('Beberapa produk tidak ditemukan');
    }

    // 2. Validasi semua produk milik merchant yang sama
    const invalidMerchant = products.find(
      (p) => p.merchant_id !== dto.merchant_id,
    );
    if (invalidMerchant) {
      throw new BadRequestException(
        'Semua produk harus dari merchant yang sama',
      );
    }

    // 3. Hitung total
    let totalAmount = 0;
    const orderItems = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.product_id);
      const unitPrice = Number(product!.price);
      const subtotal = unitPrice * item.quantity;
      totalAmount += subtotal;

      return {
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: unitPrice,
      };
    });

    // 4. Insert order
    const [longitude, latitude] = dto.delivery_location;
    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({
        consumer_id: consumerId,
        merchant_id: dto.merchant_id,
        status: OrderStatus.PENDING_PAYMENT,
        total_amount: totalAmount,
        delivery_fee: 0,
        platform_fee: 0,
        delivery_address: dto.delivery_address,
        delivery_location: `POINT(${longitude} ${latitude})`,
        notes: dto.notes ?? null,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 5. Insert order items
    const itemsPayload = orderItems.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await admin
      .from('order_items')
      .insert(itemsPayload);

    if (itemsError) {
      // Rollback: hapus order
      await admin.from('orders').delete().eq('id', order.id);
      throw itemsError;
    }

    return order;
  }

  async findAll() {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async findById(id: string) {
    const admin = this.supabase.getAdmin();

    const { data: order, error } = await admin
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!order) throw new NotFoundException('Order tidak ditemukan');

    // Ambil order items
    const { data: items } = await admin
      .from('order_items')
      .select('*')
      .eq('order_id', id);

    return { ...order, items: items ?? [] };
  }

  async findByConsumer(consumerId: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('orders')
      .select('*')
      .eq('consumer_id', consumerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  /**
   * Update status order dengan validasi state machine.
   */
     async updateStatus(id: string, newStatus: OrderStatus) {
    const order = await this.findById(id);

    // Validasi transisi
    OrderStateMachine.validateTransition(
      order.status as OrderStatus,
      newStatus,
    );

    const { data, error } = await this.supabase
      .getAdmin()
      .from('orders')
      .update({ status: newStatus })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // 🔔 Broadcast realtime
    const payload = {
      order_id: id,
      status: newStatus,
      updated_at: data.updated_at,
    };

    // Ke consumer
    this.realtime.emitToUser(order.consumer_id, 'order_status_changed', payload);

    // Ke room order
    this.realtime.emitToOrder(id, 'order_updated', payload);

    // Ke driver (kalau ada)
    if (order.driver_id) {
      const { data: driver } = await this.supabase
        .getAdmin()
        .from('drivers')
        .select('user_id')
        .eq('id', order.driver_id)
        .maybeSingle();

      if (driver?.user_id) {
        this.realtime.emitToUser(driver.user_id, 'order_status_changed', payload);
      }
    }

        return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase
      .getAdmin()
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Order berhasil dihapus' };
  }
  /**
   * Cek apakah order bisa di-cancel.
   */
  async canCancel(orderId: string, userId: string) {
    const admin = this.supabase.getAdmin();

    const { data: order, error } = await admin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (error) throw error;
    if (!order) throw new NotFoundException('Order tidak ditemukan');

    // Validasi owner
    if (order.consumer_id !== userId) {
      return {
        can_cancel: false,
        reason: 'Anda bukan pemilik order ini',
      };
    }

    // Sudah cancelled?
    if (order.status === 'CANCELLED') {
      return { can_cancel: false, reason: 'Order sudah dibatalkan' };
    }

    // Sudah COMPLETED?
    if (order.status === 'COMPLETED') {
      return { can_cancel: false, reason: 'Order sudah selesai' };
    }

    // Window 5 menit setelah created (kalau status PENDING_PAYMENT atau PAID)
    const canCancelStatus = [
      'PENDING_PAYMENT',
      'PAID',
      'SEARCHING_DRIVER',
    ];

    if (!canCancelStatus.includes(order.status)) {
      return {
        can_cancel: false,
        reason: `Order dengan status ${order.status} tidak bisa dibatalkan. Driver sudah dalam perjalanan.`,
      };
    }

    // Cek window waktu (5 menit setelah PAID atau setelah create)
    const createdAt = new Date(order.created_at).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (order.status === 'PENDING_PAYMENT') {
      return { can_cancel: true, reason: null, free_cancel: true };
    }

    if (now - createdAt > fiveMinutes && order.status === 'PAID') {
      return {
        can_cancel: true,
        reason: null,
        free_cancel: false,
        message: 'Cancel setelah 5 menit mungkin ada biaya',
      };
    }

    return { can_cancel: true, reason: null, free_cancel: true };
  }

  /**
   * Cancel order.
   */
  async cancel(orderId: string, userId: string, dto: CancelOrderDto) {
    const admin = this.supabase.getAdmin();

    // 1. Cek bisa cancel
    const check = await this.canCancel(orderId, userId);

    if (!check.can_cancel) {
      throw new BadRequestException(check.reason);
    }

    // 2. Ambil order
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) throw new NotFoundException('Order tidak ditemukan');

    // 3. Kalau PAID, refund via ledger
    if (order.status === 'PAID' && order.driver_id === null) {
      // Nanti: refund via ledger (kita skip dulu, karena wallet user belum ada transaksi)
      // TODO: implement refund
    }

    // 4. Update order
    const { data: updated, error: updateError } = await admin
      .from('orders')
      .update({
        status: 'CANCELLED',
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId,
        cancellation_reason: dto.reason ?? 'Dibatalkan oleh user',
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 5. Kalau ada driver, bebaskan
    if (order.driver_id) {
      await admin
        .from('drivers')
        .update({ is_busy: false })
        .eq('id', order.driver_id);
    }

    // 6. Broadcast realtime
    const payload = {
      order_id: orderId,
      status: 'CANCELLED',
      reason: dto.reason ?? 'Dibatalkan oleh user',
    };

    this.realtime.emitToUser(order.consumer_id, 'order_cancelled', payload);
    this.realtime.emitToOrder(orderId, 'order_updated', payload);

    // Ke driver (kalau ada)
    if (order.driver_id) {
      const { data: driver } = await admin
        .from('drivers')
        .select('user_id')
        .eq('id', order.driver_id)
        .maybeSingle();

      if (driver?.user_id) {
        this.realtime.emitToUser(driver.user_id, 'order_cancelled', payload);
      }
    }

    return {
      message: 'Order berhasil dibatalkan',
      order: updated,
    };
  }
}
