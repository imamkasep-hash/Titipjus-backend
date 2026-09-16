import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { SupabaseService } from '../../database/supabase.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    SupabaseService,
    SupabaseAuthGuard,
    AdminGuard,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
