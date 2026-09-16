import { Module } from '@nestjs/common';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';
import { SupabaseService } from '../../database/supabase.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Module({
  controllers: [FavoritesController],
  providers: [FavoritesService, SupabaseService, SupabaseAuthGuard],
  exports: [FavoritesService],
})
export class FavoritesModule {}
