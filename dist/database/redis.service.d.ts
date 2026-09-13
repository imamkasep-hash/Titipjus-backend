import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';
export declare class RedisService implements OnModuleInit {
    private readonly config;
    private readonly logger;
    private _client;
    constructor(config: ConfigService);
    onModuleInit(): void;
    get client(): Redis;
}
