import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/realtime',
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  // Map: userId → socketId(s)
  private userSockets = new Map<string, Set<string>>();

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Client connect — verifikasi token Supabase.
   */
  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization?.replace('Bearer ', '') as string);

      if (!token) {
        this.logger.warn(`Client ${client.id} tanpa token — disconnect`);
        client.disconnect();
        return;
      }

      const { data, error } = await this.supabase
        .getClient()
        .auth.getUser(token);

      if (error || !data.user) {
        this.logger.warn(`Client ${client.id} token invalid — disconnect`);
        client.disconnect();
        return;
      }

      const userId = data.user.id;

      // Simpan koneksi
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Join room per user
      client.join(`user:${userId}`);

      this.logger.log(`✅ User ${userId} connected (socket: ${client.id})`);

      client.emit('connected', { userId, socketId: client.id });
    } catch (err) {
            this.logger.error(`Connection error: ${(err as Error).message}`);
      client.disconnect();
    }
  }

  /**
   * Client disconnect.
   */
  handleDisconnect(client: Socket) {
    this.userSockets.forEach((sockets, userId) => {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) this.userSockets.delete(userId);
      }
    });
    this.logger.log(`❌ Client ${client.id} disconnected`);
  }

  /**
   * Client bisa join room order (untuk tracking).
   */
  @SubscribeMessage('join_order')
  handleJoinOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    if (!data?.orderId) return { error: 'orderId wajib' };
    client.join(`order:${data.orderId}`);
    this.logger.log(`Client ${client.id} join order:${data.orderId}`);
    return { ok: true, room: `order:${data.orderId}` };
  }

  @SubscribeMessage('leave_order')
  handleLeaveOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    if (!data?.orderId) return { error: 'orderId wajib' };
    client.leave(`order:${data.orderId}`);
    return { ok: true };
  }

  /**
   * Kirim event ke user tertentu (berdasarkan userId).
   */
  emitToUser(userId: string, event: string, payload: any) {
    this.server.to(`user:${userId}`).emit(event, payload);
    this.logger.log(`📤 Event "${event}" → user:${userId}`);
  }

  /**
   * Kirim event ke room order tertentu.
   */
  emitToOrder(orderId: string, event: string, payload: any) {
    this.server.to(`order:${orderId}`).emit(event, payload);
    this.logger.log(`📤 Event "${event}" → order:${orderId}`);
  }

  /**
   * Broadcast ke semua client.
   */
  broadcast(event: string, payload: any) {
    this.server.emit(event, payload);
    this.logger.log(`📢 Broadcast "${event}"`);
  }

  /**
   * Cek berapa user online.
   */
  getOnlineCount(): number {
    return this.userSockets.size;
  }
}
