import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SearchMerchantDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  is_open?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  min_rating?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
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
