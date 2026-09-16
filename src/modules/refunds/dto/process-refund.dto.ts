import { IsString, IsIn, IsOptional, MaxLength } from 'class-validator';

export class ProcessRefundDto {
  @IsString()
  @IsIn(['APPROVED', 'REJECTED', 'COMPLETED'])
  action: 'APPROVED' | 'REJECTED' | 'COMPLETED';

  @IsString()
  @IsOptional()
  @MaxLength(500)
  admin_notes?: string;
}
