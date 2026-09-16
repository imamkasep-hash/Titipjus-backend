import {
  IsString,
  IsOptional,
  IsUUID,
  IsIn,
  IsObject,
  MaxLength,
} from 'class-validator';

export class CreateNotificationDto {
  @IsUUID()
  user_id: string;

  @IsString()
  @IsIn([
    'ORDER_UPDATE',
    'PROMO',
    'CHAT',
    'PAYMENT',
    'SYSTEM',
    'REPORT_UPDATE',
    'WITHDRAWAL',
  ])
  type: string;

  @IsString()
  @IsIn(['LOW', 'NORMAL', 'HIGH'])
  @IsOptional()
  priority?: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(1000)
  body: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}
