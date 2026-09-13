"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MatchingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchingService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../../database/supabase.service");
let MatchingService = MatchingService_1 = class MatchingService {
    constructor(supabase) {
        this.supabase = supabase;
        this.logger = new common_1.Logger(MatchingService_1.name);
        this.MAX_DISTANCE_KM = 5;
        this.HEARTBEAT_THRESHOLD_MS = 30000;
    }
    async findNearestDrivers(merchantLocation) {
        const supabase = this.supabase.getAdmin();
        const { data: drivers, error } = await supabase
            .from('drivers')
            .select('*')
            .eq('is_online', true)
            .eq('is_busy', false)
            .gt('last_heartbeat', new Date(Date.now() - this.HEARTBEAT_THRESHOLD_MS).toISOString());
        if (error)
            throw error;
        const nearbyDrivers = drivers
            .map((driver) => ({
            ...driver,
            distance: this.haversineDistance(merchantLocation.lat, merchantLocation.lng, driver.current_location.coordinates[1], driver.current_location.coordinates[0]),
        }))
            .filter((d) => d.distance <= this.MAX_DISTANCE_KM)
            .sort((a, b) => a.distance - b.distance);
        return nearbyDrivers;
    }
    haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    toRad(deg) {
        return deg * (Math.PI / 180);
    }
};
exports.MatchingService = MatchingService;
exports.MatchingService = MatchingService = MatchingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], MatchingService);
//# sourceMappingURL=matching.service.js.map