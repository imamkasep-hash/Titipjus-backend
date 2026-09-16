import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';

/**
 * Guard untuk endpoint admin.
 * Wajib dipakai SETELAH SupabaseAuthGuard (karena butuh req.user.userId).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.userId) {
      throw new ForbiddenException('User tidak terautentikasi');
    }

    // Ambil role dari database
    const { data: profile } = await this.supabase
      .getAdmin()
      .from('users')
      .select('role, status')
      .eq('id', user.userId)
      .maybeSingle();

    if (!profile) {
      throw new ForbiddenException('User profile tidak ditemukan');
    }

    if (profile.status !== 'ACTIVE') {
      throw new ForbiddenException('Akun Anda tidak aktif');
    }

    if (profile.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Akses ditolak. Endpoint ini hanya untuk admin.',
      );
    }

    // Tambah info role ke request
    request.user.role = profile.role;

    return true;
  }
}
