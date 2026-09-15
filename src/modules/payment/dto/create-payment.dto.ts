import { IsUUID } from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  order_id: string;
}

