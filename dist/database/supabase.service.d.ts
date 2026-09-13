import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
export declare class SupabaseService implements OnModuleInit {
    private config;
    private client;
    private adminClient;
    constructor(config: ConfigService);
    onModuleInit(): void;
    getClient(): SupabaseClient<any, "public", "public", any, any>;
    getAdmin(): SupabaseClient<any, "public", "public", any, any>;
}
