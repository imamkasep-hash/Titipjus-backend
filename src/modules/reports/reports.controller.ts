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
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Controller('reports')
@UseGuards(SupabaseAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: any, @Body() dto: CreateReportDto) {
    return this.reportsService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Query('status') status?: string) {
    return this.reportsService.findAll(status);
  }

  @Get('me')
  findMine(@Req() req: any) {
    return this.reportsService.findByReporter(req.user.userId);
  }

  @Get('stats')
  getStats() {
    return this.reportsService.getStats();
  }

  @Get(':id')
  findById(@Param('id') id: string, @Req() req: any) {
    return this.reportsService.findById(id, req.user.userId);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateReportDto) {
    return this.reportsService.updateStatus(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reportsService.remove(id);
  }
}
