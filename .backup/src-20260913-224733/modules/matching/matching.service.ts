// src/modules/matching/matching.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);
  private readonly MAX_DISTANCE_KM = 5;
  private readonly HEARTBEAT_THRESHOLD_MS = 30000;

  constructor(private supabase: SupabaseService) {}

  async findNearestDrivers(merchantLocation: { lat: number; lng: number }) {
    const supabase = this.supabase.getAdmin();
    
    // Query driver online & tidak busy dengan PostGIS
    const { data: drivers, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('is_online', true)
      .eq('is_busy', false)
      .gt('last_heartbeat', new Date(Date.now() - this.HEARTBEAT_THRESHOLD_MS).toISOString());

    if (error) throw error;

    // Filter dengan Haversine formula
    const nearbyDrivers = drivers
      .map((driver) => ({
        ...driver,
        distance: this.haversineDistance(
          merchantLocation.lat,
          merchantLocation.lng,
          driver.current_location.coordinates[1],
          driver.current_location.coordinates[0]
        ),
      }))
      .filter((d) => d.distance <= this.MAX_DISTANCE_KM)
      .sort((a, b) => a.distance - b.distance);

    return nearbyDrivers;
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius bumi dalam km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
