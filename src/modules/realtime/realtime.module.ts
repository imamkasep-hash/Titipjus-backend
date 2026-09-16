import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeController } from './realtime.controller';
import { SupabaseService } from '../../database/supabase.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Module({
  controllers: [RealtimeController],
  providers: [RealtimeGateway, SupabaseService, SupabaseAuthGuard],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
