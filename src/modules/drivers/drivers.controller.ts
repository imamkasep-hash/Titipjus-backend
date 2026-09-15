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
} from '@nestjs/common';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
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
