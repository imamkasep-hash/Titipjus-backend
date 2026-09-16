import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PromosService } from './promos.service';
import { CreatePromoDto } from './dto/create-promo.dto';
import { ValidatePromoDto } from './dto/validate-promo.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Controller('promos')
export class PromosController {
  constructor(private readonly promosService: PromosService) {}

  @Post()
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreatePromoDto) {
    return this.promosService.create(dto);
  }

  @Get()
  @UseGuards(SupabaseAuthGuard)
  findAll() {
    return this.promosService.findAll();
  }

  @Get('active')
  findActive() {
    return this.promosService.findActive();
  }

  @Get('me/usages')
  @UseGuards(SupabaseAuthGuard)
  getMyUsages(@Req() req: any) {
    return this.promosService.getMyUsages(req.user.userId);
  }

  @Post('validate')
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  validate(@Req() req: any, @Body() dto: ValidatePromoDto) {
    return this.promosService.validate(req.user.userId, dto);
  }

  @Get(':id')
  @UseGuards(SupabaseAuthGuard)
  findById(@Param('id') id: string) {
    return this.promosService.findById(id);
  }

  @Patch(':id/toggle')
  @UseGuards(SupabaseAuthGuard)
  toggle(@Param('id') id: string, @Body('is_active') is_active: boolean) {
    return this.promosService.toggle(id, is_active);
  }

  @Delete(':id')
  @UseGuards(SupabaseAuthGuard)
  remove(@Param('id') id: string) {
    return this.promosService.remove(id);
  }
}
