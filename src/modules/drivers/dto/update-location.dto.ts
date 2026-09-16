import {
  IsArray,
  IsNumber,
  ArrayMinSize,
  ArrayMaxSize,
  Min,
  Max,
} from 'class-validator';

export class UpdateLocationDto {
  // Format: [longitude, latitude]
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  @Min(-180, { each: true })
  @Max(180, { each: true })
  location: [number, number];
}
