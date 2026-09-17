import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  Min,
  Length,
} from 'class-validator';

export class CreateProductDto {
  @IsUUID()
  merchant_id: string;

  @IsString()
  @Length(2, 100)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  stock_quantity?: number;

  @IsBoolean()
  @IsOptional()
  is_available?: boolean;

  @IsString()
  @IsOptional()
  image_url?: string;
}
