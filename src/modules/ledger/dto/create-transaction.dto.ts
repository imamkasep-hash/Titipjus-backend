import {
  IsUUID,
  IsNumber,
  IsString,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateTransactionDto {
  @IsUUID()
  order_id: string;

  @IsUUID()
  from_wallet_id: string;

  @IsUUID()
  to_wallet_id: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  transaction_type: string;

  @IsString()
  @IsOptional()
  description?: string;
}
