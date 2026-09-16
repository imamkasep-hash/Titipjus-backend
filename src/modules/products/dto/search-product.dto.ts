import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SearchProductDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsUUID()
  @IsOptional()
  merchant_id?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  min_price?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  max_price?: number;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  is_available?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;

  @IsString()
  @IsOptional()
  sort_by?: string = 'created_at';

  @IsString()
  @IsOptional()
  sort_order?: 'asc' | 'desc' = 'desc';
}
