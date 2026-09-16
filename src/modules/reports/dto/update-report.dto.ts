import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';

export class UpdateReportDto {
  @IsString()
  @IsIn(['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  admin_response?: string;
}
