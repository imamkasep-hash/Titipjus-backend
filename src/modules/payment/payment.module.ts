import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { MidtransService } from './midtrans.service';
import { SupabaseService } from '../../database/supabase.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Module({
  controllers: [PaymentController],
  providers: [
    PaymentService,
    MidtransService,
    SupabaseService,
    SupabaseAuthGuard,
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
