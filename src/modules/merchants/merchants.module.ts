import { Module } from '@nestjs/common';
import { MerchantsController } from './merchants.controller';
import { MerchantsService } from './merchants.service';
import { SupabaseService } from '../../database/supabase.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Module({
  controllers: [MerchantsController],
  providers: [MerchantsService, SupabaseService, SupabaseAuthGuard],
  exports: [MerchantsService],
})
export class MerchantsModule {}
