import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CancelOrderDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
