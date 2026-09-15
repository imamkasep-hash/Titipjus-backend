import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { SupabaseService } from '../../database/supabase.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, SupabaseService, SupabaseAuthGuard],
  exports: [OrdersService],
})
export class OrdersModule {}
