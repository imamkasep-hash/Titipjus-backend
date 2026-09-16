import { Module } from '@nestjs/common';
import { PromosController } from './promos.controller';
import { PromosService } from './promos.service';
import { SupabaseService } from '../../database/supabase.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Module({
  controllers: [PromosController],
  providers: [PromosService, SupabaseService, SupabaseAuthGuard],
  exports: [PromosService],
})
export class PromosModule {}
