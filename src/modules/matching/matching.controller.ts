import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MatchingService } from './matching.service';
import { FindDriverDto } from './dto/find-driver.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Controller('matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  /**
   * Cari driver terdekat untuk order (tanpa assign).
   */
  @Post('find')
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  findDrivers(@Body() dto: FindDriverDto) {
    return this.matchingService.findDriversForOrder(
      dto.order_id,
      dto.radius_km ?? 5,
    );
  }

  /**
   * Auto-assign driver terdekat ke order.
   */
  @Post('assign')
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  assignDriver(@Body() dto: FindDriverDto) {
    return this.matchingService.assignDriver(
      dto.order_id,
      dto.radius_km ?? 5,
    );
  }

  /**
   * Driver accept order.
   */
  @Post(':orderId/accept')
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  acceptOrder(@Param('orderId') orderId: string, @Req() req: any) {
    return this.matchingService.acceptOrder(orderId, req.user.userId);
  }

  /**
   * Driver reject order.
   */
  @Post(':orderId/reject')
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  rejectOrder(@Param('orderId') orderId: string, @Req() req: any) {
    return this.matchingService.rejectOrder(orderId, req.user.userId);
  }
}
