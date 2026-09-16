import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Controller('chat')
@UseGuards(SupabaseAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Kirim pesan ke order.
   */
  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  sendMessage(@Req() req: any, @Body() dto: SendMessageDto) {
    return this.chatService.sendMessage(req.user.userId, dto);
  }

  /**
   * Ambil history chat per order.
   */
  @Get('messages/:orderId')
  getMessages(@Req() req: any, @Param('orderId') orderId: string) {
    return this.chatService.getMessages(orderId, req.user.userId);
  }

  /**
   * Mark all messages as read untuk order ini.
   */
  @Post('messages/:orderId/read')
  @HttpCode(HttpStatus.OK)
  markAsRead(@Req() req: any, @Param('orderId') orderId: string) {
    return this.chatService.markAsRead(orderId, req.user.userId);
  }

  /**
   * Cek jumlah unread per order.
   */
  @Get('unread/:orderId')
  getUnread(@Req() req: any, @Param('orderId') orderId: string) {
    return this.chatService.getUnreadCount(orderId, req.user.userId);
  }
}
