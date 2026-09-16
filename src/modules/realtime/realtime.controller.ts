import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Controller('realtime')
export class RealtimeController {
  constructor(private readonly gateway: RealtimeGateway) {}

  @Get('status')
  @UseGuards(SupabaseAuthGuard)
  status() {
    return {
      online_users: this.gateway.getOnlineCount(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Test: broadcast event ke semua client.
   */
  @Post('broadcast')
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  broadcast(@Body() body: { event: string; payload: any }) {
    this.gateway.broadcast(body.event, body.payload);
    return { ok: true, event: body.event };
  }

  /**
   * Test: kirim event ke user tertentu.
   */
  @Post('emit-to-user')
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  emitToUser(
    @Body() body: { userId: string; event: string; payload: any },
  ) {
    this.gateway.emitToUser(body.userId, body.event, body.payload);
    return { ok: true };
  }
}
