import {
  Module,
  MiddlewareConsumer,
  NestModule,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { LoggerMiddleware } from './common/middleware/logger.middleware';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentModule } from './modules/payment/payment.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { MatchingModule } from './modules/matching/matching.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { ChatModule } from './modules/chat/chat.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { PromosModule } from './modules/promos/promos.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AdminModule } from './modules/admin/admin.module';
import { BannersModule } from './modules/banners/banners.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { RefundsModule } from './modules/refunds/refunds.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    ThrottlerModule.forRoot(
      process.env.NODE_ENV === 'test'
        ? [{ ttl: 60000, limit: 10000 }] // Longgar saat test
        : [
            { ttl: 60000, limit: 100 },
            { name: 'auth', ttl: 60000, limit: 5 },
          ],
    ),
    AuthModule,
    UsersModule,
    MerchantsModule,
    ProductsModule,
    CategoriesModule,
    FavoritesModule,
    OrdersModule,
    PaymentModule,
    DriversModule,
    MatchingModule,
    LedgerModule,
    RealtimeModule,
    ChatModule,
    ReviewsModule,
    PromosModule,
    ReportsModule,
    AdminModule,
    BannersModule,
    NotificationsModule,
    ShiftsModule,
    RefundsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
