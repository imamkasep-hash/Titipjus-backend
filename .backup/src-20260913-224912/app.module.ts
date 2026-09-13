// src/app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 menit
        limit: 100, // default: 100 req/menit
      },
      {
        name: 'auth',
        ttl: 60000,
        limit: 5, // auth: 5 req/menit
      },
      {
        name: 'order',
        ttl: 60000,
        limit: 3, // order: 3 req/menit
      },
    ]),
    // ... other modules
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
