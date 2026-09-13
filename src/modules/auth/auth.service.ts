import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly usersService: UsersService,
  ) {}

  async register(dto: RegisterDto) {
    const admin = this.supabase.getAdmin();

    // 1. Sign up ke Supabase Auth
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message.includes('already')) {
        throw new ConflictException('Email sudah terdaftar');
      }
      throw new InternalServerErrorException(authError.message);
    }

    if (!authData.user) {
      throw new InternalServerErrorException('Gagal membuat user di Auth');
    }

    // 2. Buat profile di public.users
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
    } catch (profileError) {
      // Rollback: hapus user Auth kalau profile gagal
      await admin.auth.admin.deleteUser(authData.user.id);
      throw new InternalServerErrorException(
        'Gagal membuat profile: ' + (profileError as Error).message,
      );
    }
  }

  async login(dto: LoginDto) {
    const client = this.supabase.getClient();

    const { data, error } = await client.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data.session || !data.user) {
      throw new UnauthorizedException('Email/password salah');
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
}
