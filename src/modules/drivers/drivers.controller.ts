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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post()
  @UseGuards(SupabaseAuthGuard)
  create(@Req() req: any, @Body() dto: CreateDriverDto) {
    return this.driversService.create(req.user.userId, dto);
  }

  @Get()
  findAll() {
    return this.driversService.findAll();
  }

  @Get('available')
  findAvailable() {
    return this.driversService.findAvailable();
  }

  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  findMine(@Req() req: any) {
    return this.driversService.findByUserId(req.user.userId);
  }

  /**
   * Driver update lokasi GPS.
   */
  @Patch('location')
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  updateLocation(@Req() req: any, @Body() dto: UpdateLocationDto) {
    return this.driversService.updateLocation(req.user.userId, dto);
  }

  /**
   * Ambil lokasi driver by ID (untuk tracking user).
   */
  @Get(':id/location')
  getLocation(@Param('id') id: string) {
    return this.driversService.getDriverLocation(id);
  }
    /**
   * Earnings summary driver.
   */
  @Get('earnings')
  @UseGuards(SupabaseAuthGuard)
  getEarnings(@Req() req: any) {
    return this.driversService.getEarningsSummary(req.user.userId);
  }

  /**
   * History earnings driver.
   */
  @Get('earnings/history')
  @UseGuards(SupabaseAuthGuard)
  getEarningsHistory(@Req() req: any) {
    return this.driversService.getEarningsHistory(req.user.userId);
  }

  /**
   * Request penarikan saldo.
   */
  @Post('withdraw')
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  requestWithdraw(@Req() req: any, @Body() dto: WithdrawDto) {
    return this.driversService.requestWithdraw(req.user.userId, dto);
  }

  /**
   * List semua withdrawal.
   */
  @Get('withdrawals')
  @UseGuards(SupabaseAuthGuard)
  getWithdrawals(@Req() req: any) {
    return this.driversService.getWithdrawals(req.user.userId);
  }
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.driversService.findById(id);
  }

  @Patch(':id')
  @UseGuards(SupabaseAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateDriverDto) {
    return this.driversService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(SupabaseAuthGuard)
  remove(@Param('id') id: string) {
    return this.driversService.remove(id);
  }
}
