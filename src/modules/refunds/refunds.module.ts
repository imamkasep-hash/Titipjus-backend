import { Module } from '@nestjs/common';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';
import { SupabaseService } from '../../database/supabase.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { LedgerModule } from '../ledger/ledger.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [LedgerModule, RealtimeModule],
  controllers: [RefundsController],
  providers: [RefundsService, SupabaseService, SupabaseAuthGuard, AdminGuard],
  exports: [RefundsService],
})
export class RefundsModule {}
