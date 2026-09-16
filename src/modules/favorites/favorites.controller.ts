import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Controller('favorites')
@UseGuards(SupabaseAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  /**
   * List favorite saya.
   */
  @Get()
  getMyFavorites(@Req() req: any) {
    return this.favoritesService.getMyFavorites(req.user.userId);
  }

  /**
   * Count favorite.
   */
  @Get('count')
  getCount(@Req() req: any) {
    return this.favoritesService.getCount(req.user.userId);
  }

  /**
   * Tambah merchant ke favorite.
   */
  @Post(':merchantId')
  @HttpCode(HttpStatus.CREATED)
  add(@Req() req: any, @Param('merchantId') merchantId: string) {
    return this.favoritesService.add(req.user.userId, merchantId);
  }

  /**
   * Hapus merchant dari favorite.
   */
  @Delete(':merchantId')
  @HttpCode(HttpStatus.OK)
  remove(@Req() req: any, @Param('merchantId') merchantId: string) {
    return this.favoritesService.remove(req.user.userId, merchantId);
  }

  /**
   * Toggle favorite (add kalau belum, remove kalau sudah).
   */
  @Post(':merchantId/toggle')
  @HttpCode(HttpStatus.OK)
  toggle(@Req() req: any, @Param('merchantId') merchantId: string) {
    return this.favoritesService.toggle(req.user.userId, merchantId);
  }

  /**
   * Cek apakah merchant sudah di-favorite.
   */
  @Get('check/:merchantId')
  check(@Req() req: any, @Param('merchantId') merchantId: string) {
    return this.favoritesService.checkFavorite(req.user.userId, merchantId);
  }
}
