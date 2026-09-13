import { ConfigService } from '@nestjs/config';
export declare class MidtransService {
    private config;
    private snap;
    constructor(config: ConfigService);
    createTransaction(order: {
        id: string;
        total: number;
        customer: {
            name: string;
            email: string;
            phone: string;
        };
    }): Promise<any>;
    verifyNotification(notification: any): Promise<any>;
}
