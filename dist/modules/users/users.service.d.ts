import { SupabaseService } from '../../database/supabase.service';
export interface CreateUserProfileDto {
    id: string;
    phone: string;
    full_name?: string;
    role?: string;
}
export declare class UsersService {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    findById(id: string): Promise<any>;
    findByPhone(phone: string): Promise<any>;
    createProfile(payload: CreateUserProfileDto): Promise<any>;
    updateProfile(id: string, payload: Partial<CreateUserProfileDto>): Promise<any>;
    findAll(): Promise<{
        id: any;
        role: any;
        phone: any;
        full_name: any;
        status: any;
        created_at: any;
    }[]>;
    findByIdOrFail(id: string): Promise<any>;
}
