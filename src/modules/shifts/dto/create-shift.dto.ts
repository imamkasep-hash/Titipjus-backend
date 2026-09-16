import {
  IsUUID,
  IsNumber,
  IsString,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  Matches,
} from 'class-validator';

export class CreateShiftDto {
  @IsUUID()
  zone_id: string;

  @IsNumber()
  @Min(0)
  @Max(6)
  day_of_week: number;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'start_time harus format HH:MM (contoh: 08:00)',
  })
  start_time: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'end_time harus format HH:MM (contoh: 16:00)',
  })
  end_time: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
