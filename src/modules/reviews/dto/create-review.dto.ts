import {
  IsUUID,
  IsString,
  IsNumber,
  IsIn,
  IsOptional,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateReviewDto {
  @IsUUID()
  order_id: string;

  @IsString()
  @IsIn(['merchant', 'driver'])
  target_type: 'merchant' | 'driver';

  @IsUUID()
  target_id: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  comment?: string;
}
