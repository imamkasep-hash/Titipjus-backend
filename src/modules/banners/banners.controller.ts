import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BannersService } from './banners.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  // ============ PUBLIC ============

  @Get('active')
  findActive(@Query('position') position?: string) {
    return this.bannersService.findActive(position);
  }

  // ============ ADMIN ============

  @Post()
  @UseGuards(SupabaseAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateBannerDto) {
    return this.bannersService.create(dto);
  }

  @Get()
  @UseGuards(SupabaseAuthGuard, AdminGuard)
  findAll() {
    return this.bannersService.findAll();
  }

  @Get(':id')
  @UseGuards(SupabaseAuthGuard, AdminGuard)
  findById(@Param('id') id: string) {
    return this.bannersService.findById(id);
  }

  @Patch(':id')
  @UseGuards(SupabaseAuthGuard, AdminGuard)
  update(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.bannersService.update(id, dto);
  }

  @Patch(':id/toggle')
  @UseGuards(SupabaseAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  toggle(@Param('id') id: string, @Body('is_active') isActive: boolean) {
    return this.bannersService.toggle(id, isActive);
  }

  @Delete(':id')
  @UseGuards(SupabaseAuthGuard, AdminGuard)
  remove(@Param('id') id: string) {
    return this.bannersService.remove(id);
  }
}
