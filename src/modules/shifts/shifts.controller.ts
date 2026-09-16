import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { CreateShiftDto } from './dto/create-shift.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  // ============ ZONES (Public read, Admin write) ============

  @Get('zones')
  findAllZones(@Query('active_only') activeOnly?: string) {
    return this.shiftsService.findAllZones(activeOnly === 'true');
  }

  @Get('zones/:id')
  findZoneById(@Param('id') id: string) {
    return this.shiftsService.findZoneById(id);
  }

  @Post('zones')
  @UseGuards(SupabaseAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  createZone(@Body() dto: CreateZoneDto) {
    return this.shiftsService.createZone(dto);
  }

  @Delete('zones/:id')
  @UseGuards(SupabaseAuthGuard, AdminGuard)
  removeZone(@Param('id') id: string) {
    return this.shiftsService.removeZone(id);
  }

  @Get('zones/point/:lng/:lat')
  findZoneByPoint(
    @Param('lng') lng: string,
    @Param('lat') lat: string,
  ) {
    return this.shiftsService.findZoneByPoint(
      parseFloat(lng),
      parseFloat(lat),
    );
  }

  // ============ DRIVER SHIFTS ============

  @Post('my')
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  createShift(@Req() req: any, @Body() dto: CreateShiftDto) {
    return this.shiftsService.createShift(req.user.userId, dto);
  }

  @Get('my')
  @UseGuards(SupabaseAuthGuard)
  findMyShifts(@Req() req: any) {
    return this.shiftsService.findMyShifts(req.user.userId);
  }

  @Get('my/current')
  @UseGuards(SupabaseAuthGuard)
  checkCurrentShift(
    @Req() req: any,
    @Query('timezone') timezone?: string,
  ) {
    return this.shiftsService.checkCurrentShift(
      req.user.userId,
      timezone ?? 'Asia/Jakarta',
    );
  }

  @Delete('my/:id')
  @UseGuards(SupabaseAuthGuard)
  removeShift(@Req() req: any, @Param('id') id: string) {
    return this.shiftsService.removeShift(req.user.userId, id);
  }

  // ============ ADMIN ============

  @Get('zone/:zoneId/drivers')
  @UseGuards(SupabaseAuthGuard, AdminGuard)
  findDriversOnShift(@Param('zoneId') zoneId: string) {
    return this.shiftsService.findDriversOnShift(zoneId);
  }
}
