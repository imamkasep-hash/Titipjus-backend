import { IsString, IsNumber, IsUUID, IsOptional, Min } from 'class-validator';

export class ValidatePromoDto {
  @IsString()
  code: string;

  @IsNumber()
  @Min(0)
  order_amount: number;

  @IsUUID()
  @IsOptional()
  merchant_id?: string;
}
