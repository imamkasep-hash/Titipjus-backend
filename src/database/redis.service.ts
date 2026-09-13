import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);
  private _client: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('UPSTASH_REDIS_REST_URL');
    const token = this.config.get<string>('UPSTASH_REDIS_REST_TOKEN');

    if (!url || !token) {
      this.logger.warn('⚠️ Upstash Redis URL/token kosong di .env');
      return;
    }

    this._client = new Redis({ url, token });
    this.logger.log('✅ Upstash Redis client siap');
  }

  get client(): Redis {
    if (!this._client) throw new Error('Redis client belum diinisialisasi');
    return this._client;
  }
}
