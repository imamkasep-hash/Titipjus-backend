import { Module } from '@nestjs/common';
import { BannersController } from './banners.controller';
import { BannersService } from './banners.service';
import { SupabaseService } from '../../database/supabase.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@Module({
  controllers: [BannersController],
  providers: [BannersService, SupabaseService, SupabaseAuthGuard, AdminGuard],
  exports: [BannersService],
})
export class BannersModule {}
