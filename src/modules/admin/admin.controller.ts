import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@Controller('admin')
@UseGuards(SupabaseAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  listUsers(
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminService.listUsers(
      role,
      status,
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }

  @Patch('users/:id/status')
  @HttpCode(HttpStatus.OK)
  updateUserStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.adminService.updateUserStatus(id, status);
  }

  @Patch('users/:id/role')
  @HttpCode(HttpStatus.OK)
  updateUserRole(@Param('id') id: string, @Body('role') role: string) {
    return this.adminService.updateUserRole(id, role);
  }

  @Get('withdrawals')
  listWithdrawals(@Query('status') status?: string) {
    return this.adminService.listWithdrawals(status);
  }

  @Patch('withdrawals/:id')
  @HttpCode(HttpStatus.OK)
  processWithdrawal(
    @Param('id') id: string,
    @Body('action') action: 'APPROVED' | 'REJECTED' | 'COMPLETED',
    @Body('notes') notes?: string,
  ) {
    return this.adminService.processWithdrawal(id, action, notes);
  }

  @Get('merchants')
  listMerchants(@Query('is_open') isOpen?: string) {
    return this.adminService.listMerchants(
      isOpen === 'true' ? true : isOpen === 'false' ? false : undefined,
    );
  }

  @Patch('merchants/:id/toggle')
  @HttpCode(HttpStatus.OK)
  toggleMerchant(
    @Param('id') id: string,
    @Body('is_open') isOpen: boolean,
  ) {
    return this.adminService.toggleMerchant(id, isOpen);
  }
}
