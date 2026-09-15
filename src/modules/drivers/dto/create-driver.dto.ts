import { IsString, IsOptional, IsArray, IsNumber, ArrayMinSize, ArrayMaxSize, Min, Max } from 'class-validator';

export class CreateDriverDto {
  @IsString()
  @IsOptional()
  vehicle_type?: string;

  @IsString()
  @IsOptional()
  vehicle_plate?: string;

  // Format: [longitude, latitude]
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  @Min(-180, { each: true })
  @Max(180, { each: true })
  @IsOptional()
  current_location?: [number, number];
}
