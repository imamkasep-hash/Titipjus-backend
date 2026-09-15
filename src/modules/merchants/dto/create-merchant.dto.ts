import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  Length,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class CreateMerchantDto {
  @IsString()
  @Length(3, 100)
  store_name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  address: string;

  // Format: [longitude, latitude] — GeoJSON
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  @Min(-180, { each: true })
  @Max(180, { each: true })
  location: [number, number];

  @IsBoolean()
  @IsOptional()
  is_open?: boolean;
}
