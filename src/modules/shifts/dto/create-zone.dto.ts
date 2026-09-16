import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  MaxLength,
  ArrayMinSize,
} from 'class-validator';

export class CreateZoneDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  /**
   * Area polygon dalam format GeoJSON coordinates.
   * Format: array of [lng, lat] pairs, minimal 3 titik, harus closed (titik pertama = titik terakhir).
   * Contoh: [[106.8,-6.2],[106.9,-6.2],[106.9,-6.3],[106.8,-6.3],[106.8,-6.2]]
   */
  @IsArray()
  @ArrayMinSize(4)
  coordinates: number[][];

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
