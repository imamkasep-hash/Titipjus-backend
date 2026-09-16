import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  IsBoolean,
  IsUUID,
  Min,
  MaxLength,
  IsDateString,
} from 'class-validator';

export class CreatePromoDto {
  @IsString()
  @MaxLength(50)
  code: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsIn(['PERCENTAGE', 'FIXED'])
  discount_type: 'PERCENTAGE' | 'FIXED';

  @IsNumber()
  @Min(0.01)
  discount_value: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  max_discount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  min_purchase?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  quota?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  quota_per_user?: number;

  @IsUUID()
  @IsOptional()
  merchant_id?: string;

  @IsDateString()
  @IsOptional()
  valid_from?: string;

  @IsDateString()
  valid_until: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
