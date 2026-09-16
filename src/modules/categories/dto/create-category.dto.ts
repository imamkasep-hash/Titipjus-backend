import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateCategoryDto {
  @IsUUID()
  merchant_id: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  display_order?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
