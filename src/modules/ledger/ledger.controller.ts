import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Post('transaction')
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  createTransaction(@Body() dto: CreateTransactionDto) {
    return this.ledgerService.createTransaction(dto);
  }

  @Get('transactions')
  @UseGuards(SupabaseAuthGuard)
  findAll() {
    return this.ledgerService.findAll();
  }

  @Get('transactions/order/:orderId')
  @UseGuards(SupabaseAuthGuard)
  findByOrder(@Param('orderId') orderId: string) {
    return this.ledgerService.findByOrderId(orderId);
  }

  @Get('transactions/:id')
  @UseGuards(SupabaseAuthGuard)
  findById(@Param('id') id: string) {
    return this.ledgerService.findById(id);
  }

  @Get('wallet/me')
  @UseGuards(SupabaseAuthGuard)
  async myWallet(@Req() req: any) {
    return this.ledgerService.getOrCreateWallet(req.user.userId);
  }

  @Get('wallets')
  @UseGuards(SupabaseAuthGuard)
  findAllWallets() {
    return this.ledgerService.findAllWallets();
  }
}
