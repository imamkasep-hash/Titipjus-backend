import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        message: string;
        user: {
            id: any;
            email: string;
            phone: any;
            full_name: any;
            role: any;
            status: any;
        };
    }>;
    login(dto: LoginDto): Promise<{
        access_token: string;
        refresh_token: string;
        expires_at: number;
        user: {
            id: string;
            email: string;
            phone: any;
            full_name: any;
            role: any;
            status: any;
        };
    }>;
    logout(): Promise<{
        message: string;
    }>;
}
