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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../../database/supabase.service");
const users_service_1 = require("../users/users.service");
let AuthService = class AuthService {
    constructor(supabase, usersService) {
        this.supabase = supabase;
        this.usersService = usersService;
    }
    async register(dto) {
        const admin = this.supabase.getAdmin();
        const { data: authData, error: authError } = await admin.auth.admin.createUser({
            email: dto.email,
            password: dto.password,
            email_confirm: true,
        });
        if (authError) {
            if (authError.message.includes('already')) {
                throw new common_1.ConflictException('Email sudah terdaftar');
            }
            throw new common_1.InternalServerErrorException(authError.message);
        }
        if (!authData.user) {
            throw new common_1.InternalServerErrorException('Gagal membuat user di Auth');
        }
        try {
            const profile = await this.usersService.createProfile({
                id: authData.user.id,
                phone: dto.phone,
                full_name: dto.full_name,
                role: 'CONSUMER',
            });
            return {
                message: 'Registrasi berhasil',
                user: {
                    id: profile.id,
                    email: authData.user.email,
                    phone: profile.phone,
                    full_name: profile.full_name,
                    role: profile.role,
                    status: profile.status,
                },
            };
        }
        catch (profileError) {
            await admin.auth.admin.deleteUser(authData.user.id);
            throw new common_1.InternalServerErrorException('Gagal membuat profile: ' + profileError.message);
        }
    }
    async login(dto) {
        const client = this.supabase.getClient();
        const { data, error } = await client.auth.signInWithPassword({
            email: dto.email,
            password: dto.password,
        });
        if (error || !data.session || !data.user) {
            throw new common_1.UnauthorizedException('Email/password salah');
        }
        const profile = await this.usersService.findById(data.user.id);
        return {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at,
            user: {
                id: data.user.id,
                email: data.user.email,
                phone: profile?.phone ?? null,
                full_name: profile?.full_name ?? null,
                role: profile?.role ?? 'CONSUMER',
                status: profile?.status ?? 'ACTIVE',
            },
        };
    }
    async logout() {
        const client = this.supabase.getClient();
        await client.auth.signOut();
        return { message: 'Logout berhasil' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        users_service_1.UsersService])
], AuthService);
//# sourceMappingURL=auth.service.js.map