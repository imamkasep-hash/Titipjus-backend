import { Module } from '@nestjs/common';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';
import { SupabaseService } from '../../database/supabase.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@Module({
  controllers: [ShiftsController],
  providers: [ShiftsService, SupabaseService, SupabaseAuthGuard, AdminGuard],
  exports: [ShiftsService],
})
export class ShiftsModule {}
