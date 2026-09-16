import {
  IsArray,
  IsNumber,
  IsString,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ScheduleItemDto {
  @IsNumber()
  @Min(0)
  @Max(6)
  day_of_week: number;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'open_time harus format HH:MM (contoh: 08:00)',
  })
  open_time: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'close_time harus format HH:MM (contoh: 22:00)',
  })
  close_time: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

export class SetScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleItemDto)
  schedules: ScheduleItemDto[];
}
