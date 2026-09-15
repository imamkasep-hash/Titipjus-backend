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
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
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
