import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { SupabaseService } from '../../database/supabase.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, SupabaseService, SupabaseAuthGuard],
  exports: [ProductsService],
})
export class ProductsModule {}
