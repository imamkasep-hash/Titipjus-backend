// src/database/supabase.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private client: SupabaseClient;
  private adminClient: SupabaseClient;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    this.client = createClient(
      this.config.get('SUPABASE_URL'),
      this.config.get('SUPABASE_ANON_KEY'),
    );
    
    // Admin client bypass RLS (hanya untuk backend)
    this.adminClient = createClient(
      this.config.get('SUPABASE_URL'),
      this.config.get('SUPABASE_SERVICE_KEY'),
    );
  }

  getClient() {
    return this.client;
  }

  getAdmin() {
    return this.adminClient;
  }
}
