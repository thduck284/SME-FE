import { 
  RegisterDto, 
  LoginDto, 
  TokenActionRequestDto,  
  AddRoleDto, 
  AuthResponseDto, 
  ForgotPasswordResponseDto
} from '@/lib/types/auth/Auth';
import apiClient from '@/lib/services/ApiClient';

export const authService = {
  async register(body: RegisterDto): Promise<void> {
    await apiClient.post(`/auth/register`, body);
  },

  async login(body: LoginDto): Promise<AuthResponseDto> {
    const response = await apiClient.post(`/auth/login`, body);
    return response.data;
  },

  async refreshToken(body: TokenActionRequestDto): Promise<AuthResponseDto> {
    const response = await apiClient.post(`/auth/refresh-token`, body);
    return response.data;
  },

  async logout(body: TokenActionRequestDto): Promise<void> {
    await apiClient.post(`/auth/logout`, body);
  },

  async assignRole(body: AddRoleDto): Promise<void> {
    await apiClient.post(`/auth/assign-role`, body);
  },

  async getProfile(): Promise<any> {
    const response = await apiClient.get(`/auth/profile`);
    return response.data;
  },

  async forgotPassword(): Promise<ForgotPasswordResponseDto> {
    const response = await apiClient.get(`/auth/forgot-password`);
    return response.data;
  },

  async resendVerifyEmail(email: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/auth/resend-verify-email`, { email });
    return response.data;
  },
};