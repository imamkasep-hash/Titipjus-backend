import { CanActivate, ExecutionContext } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
export declare class SupabaseAuthGuard implements CanActivate {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
