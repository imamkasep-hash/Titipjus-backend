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
} from '@nestjs/common';
import { MerchantsService } from './merchants.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
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
