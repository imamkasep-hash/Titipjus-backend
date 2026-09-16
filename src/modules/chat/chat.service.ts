import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /**
   * Validasi user punya akses ke order ini (consumer atau driver).
   */
  private async validateOrderAccess(orderId: string, userId: string) {
    const admin = this.supabase.getAdmin();

    const { data: order, error } = await admin
      .from('orders')
      .select('id, consumer_id, driver_id')
      .eq('id', orderId)
      .maybeSingle();

    if (error) throw error;
    if (!order) throw new NotFoundException('Order tidak ditemukan');

    // Cek apakah user adalah consumer
    if (order.consumer_id === userId) {
      return { role: 'consumer', order };
    }

    // Cek apakah user adalah driver yang di-assign
    if (order.driver_id) {
      const { data: driver } = await admin
        .from('drivers')
        .select('id, user_id')
        .eq('id', order.driver_id)
        .maybeSingle();

      if (driver?.user_id === userId) {
        return { role: 'driver', order, driver };
      }
    }

    throw new ForbiddenException(
      'Anda tidak punya akses ke chat order ini',
    );
  }

  /**
   * Kirim pesan chat.
   */
  async sendMessage(userId: string, dto: SendMessageDto) {
    const admin = this.supabase.getAdmin();

    // 1. Validasi akses
    const { role, order, driver } = await this.validateOrderAccess(
      dto.order_id,
      userId,
    );

    // 2. Insert message
    const { data: message, error } = await admin
      .from('chat_messages')
      .insert({
        order_id: dto.order_id,
        sender_id: userId,
        message: dto.message,
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;

    // 3. Tentukan penerima
    const recipientIds: string[] = [];

    if (role === 'consumer') {
      // Kalau consumer yang kirim, penerima = driver (kalau ada)
      if (driver?.user_id) recipientIds.push(driver.user_id);
    } else if (role === 'driver') {
      // Kalau driver yang kirim, penerima = consumer
      recipientIds.push(order.consumer_id);
    }

    // 4. Broadcast ke room order + penerima
    const payload = {
      id: message.id,
      order_id: message.order_id,
      sender_id: message.sender_id,
      sender_role: role,
      message: message.message,
      created_at: message.created_at,
    };

    this.realtime.emitToOrder(dto.order_id, 'new_message', payload);

    for (const recipientId of recipientIds) {
      this.realtime.emitToUser(recipientId, 'new_message', payload);
    }

    return {
      ...message,
      sender_role: role,
    };
  }

  /**
   * Ambil history chat per order.
   */
  async getMessages(orderId: string, userId: string, limit = 100) {
    const admin = this.supabase.getAdmin();

    // 1. Validasi akses
    await this.validateOrderAccess(orderId, userId);

    // 2. Ambil messages
    const { data, error } = await admin
      .from('chat_messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return data ?? [];
  }

  /**
   * Mark messages as read (untuk penerima).
   */
  async markAsRead(orderId: string, userId: string) {
    const admin = this.supabase.getAdmin();

    // Validasi akses
    await this.validateOrderAccess(orderId, userId);

    // Update semua pesan di order ini yang BUKAN dari user ini, jadi is_read = true
    const { data, error } = await admin
      .from('chat_messages')
      .update({ is_read: true })
      .eq('order_id', orderId)
      .neq('sender_id', userId)
      .eq('is_read', false)
      .select();

    if (error) throw error;

    return {
      message: 'Messages marked as read',
      count: data?.length ?? 0,
    };
  }

  /**
   * Ambil jumlah unread per order.
   */
  async getUnreadCount(orderId: string, userId: string) {
    const admin = this.supabase.getAdmin();

    await this.validateOrderAccess(orderId, userId);

    const { count, error } = await admin
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', orderId)
      .neq('sender_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    return { unread_count: count ?? 0 };
  }
}
