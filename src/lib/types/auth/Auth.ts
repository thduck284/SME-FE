export interface RegisterDto {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface TokenActionRequestDto {
  refreshToken: string;
}

export interface TokenVerifyDto {
  token: string;
}

export interface AddRoleDto {
  userId: string;
  role: string;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

export interface TokenVerifyResponseDto {
  isValid: boolean;
  userId?: string;
}

export interface ForgotPasswordResponseDto {
  success: boolean;
  message: string;
  resetUrl: string;
}