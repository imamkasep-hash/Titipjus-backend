import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { SupabaseService } from '../../database/supabase.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService, SupabaseService, SupabaseAuthGuard],
  exports: [ReviewsService],
})
export class ReviewsModule {}
