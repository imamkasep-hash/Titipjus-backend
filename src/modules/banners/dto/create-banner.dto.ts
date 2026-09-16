import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsIn,
  IsDateString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBannerDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsUrl()
  image_url: string;

  @IsUrl()
  @IsOptional()
  link_url?: string;

  @IsString()
  @IsIn(['TOP', 'MIDDLE', 'BOTTOM'])
  @IsOptional()
  position?: 'TOP' | 'MIDDLE' | 'BOTTOM';

  @IsNumber()
  @IsOptional()
  @Min(0)
  display_order?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsDateString()
  @IsOptional()
  valid_from?: string;

  @IsDateString()
  @IsOptional()
  valid_until?: string;
}
