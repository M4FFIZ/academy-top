import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  telegram?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class SetUsernameDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9_]{5,32}$/, {
    message: 'Username: 5–32 символа, латиница, цифры, _',
  })
  username!: string;
}
