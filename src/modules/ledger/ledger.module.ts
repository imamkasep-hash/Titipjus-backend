import { Module } from '@nestjs/common';
import { LedgerController } from './ledger.controller';
import { LedgerService } from './ledger.service';
import { SupabaseService } from '../../database/supabase.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Module({
  controllers: [LedgerController],
  providers: [LedgerService, SupabaseService, SupabaseAuthGuard],
  exports: [LedgerService],
})
export class LedgerModule {}
