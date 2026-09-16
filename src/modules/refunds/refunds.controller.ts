import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Req,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@Controller('refunds')
@UseGuards(SupabaseAuthGuard)
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  /**
   * User request refund manual.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createRequest(@Req() req: any, @Body() dto: CreateRefundDto) {
    return this.refundsService.createRequest(req.user.userId, dto);
  }

  /**
   * List refund saya.
   */
  @Get('me')
  findMine(@Req() req: any) {
    return this.refundsService.findByUser(req.user.userId);
  }

  /**
   * Detail refund.
   */
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.refundsService.findById(id);
  }

  // ============ ADMIN ============

  /**
   * List semua refund (admin).
   */
  @Get()
  @UseGuards(AdminGuard)
  findAll(@Query('status') status?: string) {
    return this.refundsService.findAll(status);
  }

  /**
   * Proses refund (approve/reject/complete).
   */
  @Patch(':id/process')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  process(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: ProcessRefundDto,
  ) {
    return this.refundsService.process(id, req.user.userId, dto);
  }

  /**
   * Statistik refund (admin).
   */
  @Get('admin/stats')
  @UseGuards(AdminGuard)
  getStats() {
    return this.refundsService.getStats();
  }
}
