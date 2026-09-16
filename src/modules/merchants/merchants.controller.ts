import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';import { MerchantsService } from './merchants.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { SearchMerchantDto } from './dto/search-merchant.dto';
import { SetScheduleDto } from './dto/set-schedule.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Controller('merchants')
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Post()
  @UseGuards(SupabaseAuthGuard)
  create(@Req() req: any, @Body() dto: CreateMerchantDto) {
    return this.merchantsService.create(req.user.userId, dto);
  }

  @Get()
  findAll() {
    return this.merchantsService.findAll();
  }

  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  findMine(@Req() req: any) {
    return this.merchantsService.findByUserId(req.user.userId);
  }
    /**
   * Statistik merchant saya.
   */
  @Get('stats/me')
  @UseGuards(SupabaseAuthGuard)
  async myStats(@Req() req: any) {
    const merchants = await this.merchantsService.findByUserId(
      req.user.userId,
    );
    if (!merchants || merchants.length === 0) {
      return { error: 'Anda belum punya merchant' };
    }
    return this.merchantsService.getStats(merchants[0].id);
  }

  /**
   * Top products merchant saya.
   */
  @Get('stats/me/top-products')
  @UseGuards(SupabaseAuthGuard)
  async myTopProducts(@Req() req: any, @Query('limit') limit?: string) {
    const merchants = await this.merchantsService.findByUserId(
      req.user.userId,
    );
    if (!merchants || merchants.length === 0) {
      return { error: 'Anda belum punya merchant' };
    }
    return this.merchantsService.getTopProducts(
      merchants[0].id,
      limit ? parseInt(limit) : 10,
    );
  }

  /**
   * Revenue by date merchant saya.
   */
  @Get('stats/me/revenue')
  @UseGuards(SupabaseAuthGuard)
  async myRevenue(@Req() req: any, @Query('days') days?: string) {
    const merchants = await this.merchantsService.findByUserId(
      req.user.userId,
    );
    if (!merchants || merchants.length === 0) {
      return { error: 'Anda belum punya merchant' };
    }
    return this.merchantsService.getRevenueByDate(
      merchants[0].id,
      days ? parseInt(days) : 7,
    );
  }

  /**
   * Statistik merchant by ID (public).
   */
  @Get('stats/:merchantId')
  getStats(@Param('merchantId') merchantId: string) {
    return this.merchantsService.getStats(merchantId);
  }

  /**
   * Top products merchant by ID (public).
   */
  @Get('stats/:merchantId/top-products')
  getTopProducts(
    @Param('merchantId') merchantId: string,
    @Query('limit') limit?: string,
  ) {
    return this.merchantsService.getTopProducts(
      merchantId,
      limit ? parseInt(limit) : 10,
    );
  }

  @Get('nearby')
  findNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    return this.merchantsService.findNearby(
      parseFloat(lat),
      parseFloat(lng),
      radius ? parseFloat(radius) : 5,
    );
  }
    /**
   * Search & filter merchants.
   */
  @Get('search')
  search(@Query() dto: SearchMerchantDto) {
    return this.merchantsService.search(dto);
  }
  /**
   * Set jadwal operasional merchant.
   */
  @Post(':id/schedules')
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  setSchedules(
    @Param('id') id: string,
    @Body() dto: SetScheduleDto,
  ) {
    return this.merchantsService.setSchedules(id, dto);
  }

  /**
   * Lihat jadwal operasional merchant.
   */
  @Get(':id/schedules')
  getSchedules(@Param('id') id: string) {
    return this.merchantsService.getSchedules(id);
  }

  /**
   * Cek apakah merchant sedang buka sekarang.
   */
  @Get(':id/operating-status')
  getOperatingStatus(
    @Param('id') id: string,
    @Query('timezone') timezone?: string,
  ) {
    return this.merchantsService.getOperatingStatus(
      id,
      timezone ?? 'Asia/Jakarta',
    );
  }

  /**
   * Update jadwal 1 hari.
   */
  @Patch(':id/schedules/:dayOfWeek')
  @UseGuards(SupabaseAuthGuard)
  updateScheduleDay(
    @Param('id') id: string,
    @Param('dayOfWeek') dayOfWeek: string,
    @Body() body: { shifts: { open_time: string; close_time: string }[] },
  ) {
    return this.merchantsService.updateScheduleDay(
      id,
      parseInt(dayOfWeek),
      body.shifts,
    );
  }
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.merchantsService.findById(id);
  }

  @Patch(':id')
  @UseGuards(SupabaseAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateMerchantDto) {
    return this.merchantsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(SupabaseAuthGuard)
  remove(@Param('id') id: string) {
    return this.merchantsService.remove(id);
  }
}
