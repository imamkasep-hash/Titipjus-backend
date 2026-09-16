import {
  IsUUID,
  IsString,
  IsNumber,
  IsOptional,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateRefundDto {
  @IsUUID()
  order_id: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}
