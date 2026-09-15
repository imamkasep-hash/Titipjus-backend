import { Module } from '@nestjs/common';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { SupabaseService } from '../../database/supabase.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Module({
  controllers: [MatchingController],
  providers: [MatchingService, SupabaseService, SupabaseAuthGuard],
  exports: [MatchingService],
})
export class MatchingModule {}
