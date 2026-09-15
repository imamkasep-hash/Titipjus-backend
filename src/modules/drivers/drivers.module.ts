import { Module } from '@nestjs/common';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { SupabaseService } from '../../database/supabase.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Module({
  controllers: [DriversController],
  providers: [DriversService, SupabaseService, SupabaseAuthGuard],
  exports: [DriversService],
})
export class DriversModule {}
