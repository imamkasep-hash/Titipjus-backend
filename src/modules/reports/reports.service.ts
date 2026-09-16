import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /**
   * Buat report/komplain baru.
   */
  async create(reporterId: string, dto: CreateReportDto) {
    const admin = this.supabase.getAdmin();

    // Kalau ada order_id, validasi user adalah consumer order
    if (dto.order_id) {
      const { data: order } = await admin
        .from('orders')
        .select('id, consumer_id')
        .eq('id', dto.order_id)
        .maybeSingle();

      if (!order) throw new NotFoundException('Order tidak ditemukan');

      if (order.consumer_id !== reporterId) {
        throw new ForbiddenException('Order ini bukan milik Anda');
      }
    }

    // Insert report
    const { data, error } = await admin
      .from('reports')
      .insert({
        reporter_id: reporterId,
        order_id: dto.order_id ?? null,
        target_type: dto.target_type,
        target_id: dto.target_id ?? null,
        category: dto.category,
        title: dto.title,
        description: dto.description,
        image_urls: dto.image_urls ?? [],
        status: 'OPEN',
      })
      .select()
      .single();

    if (error) throw error;

    // Broadcast ke reporter
    this.realtime.emitToUser(reporterId, 'report_created', {
      report_id: data.id,
      status: data.status,
      title: data.title,
    });

    return data;
  }

  /**
   * List semua reports (untuk admin).
   */
  async findAll(status?: string) {
    let query = this.supabase
      .getAdmin()
      .from('reports')
      .select('*');

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) throw error;
    return data ?? [];
  }

  /**
   * List reports milik user.
   */
  async findByReporter(reporterId: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('reports')
      .select('*')
      .eq('reporter_id', reporterId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  /**
   * Detail report.
   */
  async findById(id: string, requesterId: string) {
    const { data, error } = await this.supabase
      .getAdmin()
      .from('reports')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundException('Report tidak ditemukan');

    // Validasi: hanya reporter atau admin yang bisa lihat
    // (untuk sekarang, hanya reporter)
    if (data.reporter_id !== requesterId) {
      throw new ForbiddenException('Anda tidak punya akses ke report ini');
    }

    return data;
  }

  /**
   * Update status report (admin only — untuk sekarang bebas dulu).
   */
  async updateStatus(id: string, dto: UpdateReportDto) {
    const admin = this.supabase.getAdmin();

    // Cek report ada
    const { data: report } = await admin
      .from('reports')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!report) throw new NotFoundException('Report tidak ditemukan');

    // Validasi: kalau status RESOLVED/REJECTED, wajib ada admin_response
    if (
      (dto.status === 'RESOLVED' || dto.status === 'REJECTED') &&
      !dto.admin_response &&
      !report.admin_response
    ) {
      throw new BadRequestException(
        'admin_response wajib diisi untuk status RESOLVED/REJECTED',
      );
    }

    // Siapkan payload
    const payload: any = {};

    if (dto.status) {
      payload.status = dto.status;

      if (dto.status === 'RESOLVED' || dto.status === 'REJECTED') {
        payload.resolved_at = new Date().toISOString();
      }
    }

    if (dto.admin_response) {
      payload.admin_response = dto.admin_response;
    }

    const { data, error } = await admin
      .from('reports')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Broadcast ke reporter
    this.realtime.emitToUser(report.reporter_id, 'report_updated', {
      report_id: id,
      status: data.status,
      admin_response: data.admin_response,
    });

    return data;
  }

  /**
   * Hapus report (admin only — untuk sekarang skip).
   */
  async remove(id: string) {
    const { error } = await this.supabase
      .getAdmin()
      .from('reports')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Report berhasil dihapus' };
  }

  /**
   * Statistik report (admin).
   */
  async getStats() {
    const admin = this.supabase.getAdmin();

    const { data: reports, error } = await admin
      .from('reports')
      .select('status, category');

    if (error) throw error;

    const statusCount: Record<string, number> = {
      OPEN: 0,
      IN_REVIEW: 0,
      RESOLVED: 0,
      REJECTED: 0,
    };

    const categoryCount: Record<string, number> = {};

    (reports ?? []).forEach((r) => {
      statusCount[r.status] = (statusCount[r.status] ?? 0) + 1;
      categoryCount[r.category] = (categoryCount[r.category] ?? 0) + 1;
    });

    return {
      total: reports?.length ?? 0,
      by_status: statusCount,
      by_category: categoryCount,
    };
  }
}
