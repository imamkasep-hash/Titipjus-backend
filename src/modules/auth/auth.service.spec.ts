import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SupabaseService } from '../../database/supabase.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersMock: any;
  let supabaseMock: any;

  beforeEach(async () => {
    usersMock = {
      findByEmail: vi.fn(),
      createProfile: vi.fn(),   // ← FIX: pakai createProfile
      findById: vi.fn(),
    };

    supabaseMock = {
      getAdmin: vi.fn().mockReturnValue({
        auth: {
          admin: {
            createUser: vi.fn(),
            deleteUser: vi.fn(),
          },
        },
      }),
      getClient: vi.fn().mockReturnValue({
        auth: {
          signInWithPassword: vi.fn(),
          signOut: vi.fn(),
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersMock },
        { provide: SupabaseService, useValue: supabaseMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============ REGISTER ============
  describe('register', () => {
    const registerDto = {
      email: 'test@mail.com',
      password: 'password123',
      phone: '08123456789',
      full_name: 'Test User',
    };

    it('should register successfully', async () => {
      // Supabase createUser sukses
      supabaseMock.getAdmin().auth.admin.createUser.mockResolvedValue({
        data: {
          user: { id: 'user-123', email: registerDto.email },
        },
        error: null,
      });

      // UsersService.createProfile sukses
      usersMock.createProfile.mockResolvedValue({
        id: 'user-123',
        phone: registerDto.phone,
        full_name: registerDto.full_name,
        role: 'CONSUMER',
        status: 'ACTIVE',
      });

      const result = await service.register(registerDto);

      expect(result.message).toBe('Registrasi berhasil');
      expect(result.user.id).toBe('user-123');
      expect(result.user.email).toBe(registerDto.email);
      expect(result.user.role).toBe('CONSUMER');
      expect(usersMock.createProfile).toHaveBeenCalledWith({
        id: 'user-123',
        phone: registerDto.phone,
        full_name: registerDto.full_name,
        role: 'CONSUMER',
      });
    });

    it('should throw ConflictException if auth says email exists', async () => {
      supabaseMock
        .getAdmin()
        .auth.admin.createUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'User already registered' },
        });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should rollback auth user if profile creation fails', async () => {
      supabaseMock
        .getAdmin()
        .auth.admin.createUser.mockResolvedValue({
          data: { user: { id: 'user-123', email: registerDto.email } },
          error: null,
        });

      usersMock.createProfile.mockRejectedValue(new Error('DB error'));

      const deleteUserMock =
        supabaseMock.getAdmin().auth.admin.deleteUser;
      deleteUserMock.mockResolvedValue({ error: null });

      await expect(service.register(registerDto)).rejects.toThrow();

      expect(deleteUserMock).toHaveBeenCalledWith('user-123');
    });
  });

  // ============ LOGIN ============
  describe('login', () => {
    const loginDto = {
      email: 'test@mail.com',
      password: 'password123',
    };

    it('should login successfully', async () => {
      supabaseMock
        .getClient()
        .auth.signInWithPassword.mockResolvedValue({
          data: {
            user: { id: 'user-123', email: loginDto.email },
            session: {
              access_token: 'mock-token',
              refresh_token: 'mock-refresh',
              expires_at: 1234567890,
            },
          },
          error: null,
        });

      usersMock.findById.mockResolvedValue({
        id: 'user-123',
        phone: '08123456789',
        full_name: 'Test User',
        role: 'CONSUMER',
        status: 'ACTIVE',
      });

      const result = await service.login(loginDto);

      expect(result.access_token).toBe('mock-token');
      expect(result.refresh_token).toBe('mock-refresh');
      expect(result.user.id).toBe('user-123');
      expect(result.user.phone).toBe('08123456789');
    });

    it('should throw UnauthorizedException if credentials invalid', async () => {
      supabaseMock
        .getClient()
        .auth.signInWithPassword.mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'Invalid credentials' },
        });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
