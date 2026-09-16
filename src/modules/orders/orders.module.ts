import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { SupabaseService } from '../../database/supabase.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RealtimeModule } from '../realtime/realtime.module';
import { RefundsModule } from '../refunds/refunds.module';

@Module({
  imports: [RealtimeModule, RefundsModule],
  controllers: [OrdersController],
  providers: [OrdersService, SupabaseService, SupabaseAuthGuard],
  exports: [OrdersService],
})
export class OrdersModule {}
