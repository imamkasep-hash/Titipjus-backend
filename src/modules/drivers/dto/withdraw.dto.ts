import {
  IsNumber,
  IsString,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';

export class WithdrawDto {
  @IsNumber()
  @Min(10000)
  amount: number;

  @IsString()
  @MaxLength(50)
  bank_name: string;

  @IsString()
  @MaxLength(30)
  bank_account_number: string;

  @IsString()
  @MaxLength(100)
  bank_account_name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
