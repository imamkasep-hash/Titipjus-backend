import { IsEmail, IsString, MinLength, IsOptional, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @Matches(/^[0-9+\-\s]{8,20}$/, {
    message: 'phone harus berupa nomor telepon yang valid (8-20 digit)',
  })
  phone: string;

  @IsString()
  @IsOptional()
  full_name?: string;
}
