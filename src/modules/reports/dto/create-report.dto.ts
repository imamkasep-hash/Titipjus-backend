import {
  IsString,
  IsOptional,
  IsUUID,
  IsIn,
  IsArray,
  MaxLength,
  MinLength,
  ArrayMaxSize,
} from 'class-validator';

export class CreateReportDto {
  @IsUUID()
  @IsOptional()
  order_id?: string;

  @IsString()
  @IsIn(['merchant', 'driver', 'order', 'app'])
  target_type: 'merchant' | 'driver' | 'order' | 'app';

  @IsUUID()
  @IsOptional()
  target_id?: string;

  @IsString()
  @IsIn([
    'FOOD_QUALITY',
    'LATE_DELIVERY',
    'DRIVER_BEHAVIOR',
    'WRONG_ITEM',
    'MISSING_ITEM',
    'PAYMENT_ISSUE',
    'OTHER',
  ])
  category: string;

  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  @IsOptional()
  image_urls?: string[];
}
