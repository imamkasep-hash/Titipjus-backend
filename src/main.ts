import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  // 📚 Swagger Setup
  const config = new DocumentBuilder()
    .setTitle('TitipJus API')
    .setDescription(
      'Backend API untuk aplikasi TitipJus (delivery jus & minuman)',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Masukkan Supabase access token',
        in: 'header',
      },
      'access-token',
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management')
    .addTag('Merchants', 'Merchant management')
    .addTag('Products', 'Product management')
    .addTag('Categories', 'Product categories')
    .addTag('Favorites', 'User favorite merchants')
    .addTag('Orders', 'Order management')
    .addTag('Payment', 'Payment & Midtrans')
    .addTag('Drivers', 'Driver management')
    .addTag('Matching', 'Driver matching')
    .addTag('Ledger', 'Wallet & ledger')
    .addTag('Realtime', 'WebSocket gateway')
    .addTag('Chat', 'User-driver chat')
    .addTag('Reviews', 'Rating & review')
    .addTag('Promos', 'Promo & voucher')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Server jalan di http://localhost:${port}`);
  logger.log(`📚 API Docs: http://localhost:${port}/api-docs`);
}
bootstrap();
