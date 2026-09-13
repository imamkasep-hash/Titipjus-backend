import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SupabaseService } from '../../database/supabase.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Module({
  controllers: [UsersController],
  providers: [UsersService, SupabaseService, SupabaseAuthGuard],
  exports: [UsersService],
})
export class UsersModule {}
