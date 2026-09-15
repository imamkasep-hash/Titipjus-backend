import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsArray,
  ArrayMinSize,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsUUID()
  product_id: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsUUID()
  merchant_id: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsString()
  delivery_address: string;

  // Format: [longitude, latitude] — GeoJSON
  @IsArray()
  @ArrayMinSize(2)
  @IsNumber({}, { each: true })
  delivery_location: [number, number];

  @IsString()
  @IsOptional()
  notes?: string;
}
