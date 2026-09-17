import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../database/supabase.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { initializeApp, cert, App } from 'firebase-admin/app';
import { getMessaging, MulticastMessage } from 'firebase-admin/messaging';
import * as fs from 'fs';
import * as path from 'path';
@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private fcm: App | null = null;
  constructor(
    private readonly supabase: SupabaseService,
    private readonly realtime: RealtimeGateway,
    private readonly config: ConfigService,
  ) {}

  /**
   * Init Firebase Admin SDK saat module start.
   */
  onModuleInit() {
    try {
      const serviceAccountPath = path.resolve(
        process.cwd(),
        'firebase/service-account.json',
      );

      if (!fs.existsSync(serviceAccountPath)) {
        this.logger.warn(
          `⚠️  File ${serviceAccountPath} tidak ditemukan. Push notification non-aktif.`,
        );
        return;
      }

      const serviceAccount = JSON.parse(
        fs.readFileSync(serviceAccountPath, 'utf-8'),
      );

      this.fcm = initializeApp({
  credential: cert(serviceAccount),
});

      this.logger.log('✅ Firebase Admin SDK siap');
    } catch (err) {
      this.logger.error(
        `❌ Firebase init error: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Simpan token FCM user (dari mobile app).
   */
  async registerDeviceToken(userId: string, token: string, platform?: string) {
    const adminClient = this.supabase.getAdmin();

    // Upsert: 1 user bisa punya multiple device
    const { data, error } = await adminClient
      .from('device_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          platform: platform ?? 'android',
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'token' },
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Kirim notifikasi ke user.
   * - Simpan ke DB
   * - Broadcast via WebSocket
   * - Kirim push via FCM (kalau ada token)
   */
  async send(dto: CreateNotificationDto) {
    const adminClient = this.supabase.getAdmin();

    // 1. Insert notif ke DB
    const { data: notification, error } = await adminClient
      .from('notifications')
      .insert({
        user_id: dto.user_id,
        type: dto.type,
        priority: dto.priority ?? 'NORMAL',
        title: dto.title,
        body: dto.body,
        data: dto.data ?? {},
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Broadcast via WebSocket
    this.realtime.emitToUser(dto.user_id, 'notification', {
      id: notification.id,
      type: notification.type,
      priority: notification.priority,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      created_at: notification.created_at,
    });

    // 3. Kirim push via FCM (kalau Firebase siap)
    if (this.fcm) {
      await this.sendPushToUser(dto.user_id, {
        title: dto.title,
        body: dto.body,
        data: {
          notification_id: notification.id,
          type: dto.type,
        ...(dto.data || {}),
        },
      });
    }

    return notification;
  }

  /**
   * Kirim FCM push ke semua device user.
   */
  private async sendPushToUser(
    userId: string,
    payload: { title: string; body: string; data?: any },
  ) {
    try {
      const adminClient = this.supabase.getAdmin();

      const { data: tokens } = await adminClient
        .from('device_tokens')
        .select('token')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (!tokens || tokens.length === 0) {
        this.logger.debug(`User ${userId} tidak punya device token`);
        return;
      }

      const tokenList = tokens.map((t) => t.token);

      const message: MulticastMessage = {
        tokens: tokenList,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: Object.fromEntries(
          Object.entries(payload.data ?? {}).map(([k, v]) => [k, String(v)]),
        ),
        android: { priority: 'high' as const },
        apns: { payload: { aps: { sound: 'default' } } },
      };

      const response = await getMessaging().sendEachForMulticast(message);
      this.logger.log(
        `📤 Push sent to ${response.successCount}/${tokenList.length} devices`,
      );

      // Handle token yang invalid
      if (response.failureCount > 0) {
        const invalidTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (
            !resp.success &&
            (resp.error?.code === 'messaging/invalid-registration-token' ||
              resp.error?.code === 'messaging/registration-token-not-registered')
          ) {
            invalidTokens.push(tokenList[idx]);
          }
        });

        if (invalidTokens.length > 0) {
          await adminClient
            .from('device_tokens')
            .update({ is_active: false })
            .in('token', invalidTokens);

          this.logger.warn(
            `🗑️  Deactivated ${invalidTokens.length} invalid tokens`,
          );
        }
      }
    } catch (err) {
      this.logger.error(
        `FCM push error: ${(err as Error).message}`,
      );
    }
  }

  /**
   * List notifikasi user.
   */
  async findByUser(userId: string, unreadOnly = false, limit = 50) {
    let query = this.supabase
      .getAdmin()
      .from('notifications')
      .select('*')
      .eq('user_id', userId);

    if (unreadOnly) query = query.eq('is_read', false);

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  }

  /**
   * Jumlah unread.
   */
  async getUnreadCount(userId: string) {
    const { count, error } = await this.supabase
      .getAdmin()
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return { unread_count: count ?? 0 };
  }

  /**
   * Mark 1 notif sebagai read.
   */
  async markAsRead(id: string, userId: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Mark semua sebagai read.
   */
  async markAllAsRead(userId: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select();

    if (error) throw error;

    return {
      message: 'All notifications marked as read',
      count: data?.length ?? 0,
    };
  }

  /**
   * Hapus notifikasi.
   */
  async remove(id: string, userId: string) {
    const { error } = await this.supabase
      .getAdmin()
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    return { message: 'Notifikasi berhasil dihapus' };
  }
}
