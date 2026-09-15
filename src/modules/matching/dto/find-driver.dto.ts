import { IsUUID, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class FindDriverDto {
  @IsUUID()
  order_id: string;

  @IsNumber()
  @IsOptional()
  @Min(0.5)
  @Max(50)
  radius_km?: number;
}
