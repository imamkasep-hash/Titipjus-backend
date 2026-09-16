import { IsOptional, IsNumber, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
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
