import { SupabaseService } from '../../database/supabase.service';
export declare class MatchingService {
    private supabase;
    private readonly logger;
    private readonly MAX_DISTANCE_KM;
    private readonly HEARTBEAT_THRESHOLD_MS;
    constructor(supabase: SupabaseService);
    findNearestDrivers(merchantLocation: {
        lat: number;
        lng: number;
    }): Promise<any[]>;
    private haversineDistance;
    private toRad;
}
