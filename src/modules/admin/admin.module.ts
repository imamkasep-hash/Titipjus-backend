import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SupabaseService } from '../../database/supabase.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@Module({
  controllers: [AdminController],
  providers: [
    AdminService,
    SupabaseService,
    SupabaseAuthGuard,
    AdminGuard,
  ],
  exports: [AdminService],
})
export class AdminModule {}
