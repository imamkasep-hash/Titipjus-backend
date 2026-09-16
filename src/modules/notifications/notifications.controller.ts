import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@Controller('notifications')
@UseGuards(SupabaseAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Register FCM token device user.
   */
  @Post('register-token')
  @HttpCode(HttpStatus.OK)
  registerToken(
    @Req() req: any,
    @Body() body: { token: string; platform?: string },
  ) {
    return this.notificationsService.registerDeviceToken(
      req.user.userId,
      body.token,
      body.platform,
    );
  }

  /**
   * List notifikasi user.
   */
  @Get('me')
  findMine(@Req() req: any, @Query('unread_only') unread?: string) {
    return this.notificationsService.findByUser(
      req.user.userId,
      unread === 'true',
    );
  }

  /**
   * Jumlah unread.
   */
  @Get('unread-count')
  getUnreadCount(@Req() req: any) {
    return this.notificationsService.getUnreadCount(req.user.userId);
  }

  /**
   * Mark 1 notif as read.
   */
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  markAsRead(@Param('id') id: string, @Req() req: any) {
    return this.notificationsService.markAsRead(id, req.user.userId);
  }

  /**
   * Mark semua sebagai read.
   */
  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  markAllAsRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(req.user.userId);
  }

  /**
   * Hapus notifikasi.
   */
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.notificationsService.remove(id, req.user.userId);
  }

  // ============ ADMIN ============

  /**
   * Kirim notifikasi manual (admin only).
   */
  @Post('send')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  send(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.send(dto);
  }
}
