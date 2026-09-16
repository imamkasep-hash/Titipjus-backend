import { IsUUID, IsString, MinLength, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  order_id: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message: string;
}
