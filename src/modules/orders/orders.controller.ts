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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(SupabaseAuthGuard)
  create(@Req() req: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(req.user.userId, dto);
  }

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  findMine(@Req() req: any) {
    return this.ordersService.findByConsumer(req.user.userId);
  }
    /**
   * Cek apakah order bisa di-cancel.
   */
  @Get(':id/can-cancel')
  @UseGuards(SupabaseAuthGuard)
  canCancel(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.canCancel(id, req.user.userId);
  }

  /**
   * Cancel order.
   */
  @Post(':id/cancel')
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancel(id, req.user.userId, dto);
  }
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Patch(':id/status')
  @UseGuards(SupabaseAuthGuard)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @UseGuards(SupabaseAuthGuard)
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
