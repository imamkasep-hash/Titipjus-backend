import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { SupabaseService } from '../../database/supabase.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, SupabaseService, SupabaseAuthGuard],
  exports: [CategoriesService],
})
export class CategoriesModule {}
