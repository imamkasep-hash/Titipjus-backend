import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @UseGuards(SupabaseAuthGuard)
  create(@Req() req: any, @Body() dto: CreatePaymentDto) {
    return this.paymentService.create(req.user.userId, dto);
  }

  @Get()
  findAll() {
    return this.paymentService.findAll();
  }

  @Get('order/:orderId')
  findByOrder(@Param('orderId') orderId: string) {
    return this.paymentService.findByOrderId(orderId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.paymentService.findById(id);
  }

  /**
   * Webhook endpoint untuk Midtrans.
   * Endpoint ini TIDAK pakai auth guard karena dipanggil oleh Midtrans.
   */
  @Post('notification')
  handleNotification(@Body() notification: any) {
    return this.paymentService.handleNotification(notification);
  }
}
