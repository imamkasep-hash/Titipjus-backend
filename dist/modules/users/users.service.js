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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../../database/supabase.service");
let UsersService = class UsersService {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async findById(id) {
        const { data, error } = await this.supabase
            .getAdmin()
            .from('users')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error)
            throw error;
        return data;
    }
    async findByPhone(phone) {
        const { data, error } = await this.supabase
            .getAdmin()
            .from('users')
            .select('*')
            .eq('phone', phone)
            .maybeSingle();
        if (error)
            throw error;
        return data;
    }
    async createProfile(payload) {
        const { data, error } = await this.supabase
            .getAdmin()
            .from('users')
            .insert({
            id: payload.id,
            phone: payload.phone,
            full_name: payload.full_name ?? null,
            role: payload.role ?? 'CONSUMER',
        })
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async updateProfile(id, payload) {
        const { data, error } = await this.supabase
            .getAdmin()
            .from('users')
            .update(payload)
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async findAll() {
        const { data, error } = await this.supabase
            .getAdmin()
            .from('users')
            .select('id, role, phone, full_name, status, created_at');
        if (error)
            throw error;
        return data ?? [];
    }
    async findByIdOrFail(id) {
        const user = await this.findById(id);
        if (!user)
            throw new common_1.NotFoundException('User tidak ditemukan');
        return user;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], UsersService);
//# sourceMappingURL=users.service.js.map