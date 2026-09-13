// src/modules/payment/midtrans.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as midtransClient from 'midtrans-client';

@Injectable()
export class MidtransService {
  private snap: midtransClient.Snap;

  constructor(private config: ConfigService) {
    this.snap = new midtransClient.Snap({
      isProduction: this.config.get('MIDTRANS_IS_PRODUCTION') === 'true',
      serverKey: this.config.get('MIDTRANS_SERVER_KEY'),
      clientKey: this.config.get('MIDTRANS_CLIENT_KEY'),
    });
  }

  async createTransaction(order: {
    id: string;
    total: number;
    customer: { name: string; email: string; phone: string };
  }) {
    const parameter = {
      transaction_details: {
        order_id: order.id,
        gross_amount: order.total,
      },
      customer_details: {
        first_name: order.customer.name,
        email: order.customer.email,
        phone: order.customer.phone,
      },
      callbacks: {
        finish: `${this.config.get('APP_URL')}/payment/finish`,
        error: `${this.config.get('APP_URL')}/payment/error`,
        pending: `${this.config.get('APP_URL')}/payment/pending`,
      },
    };

    return await this.snap.createTransaction(parameter);
  }

  async verifyNotification(notification: any) {
    return await this.snap.transaction.notification(notification);
  }
}
