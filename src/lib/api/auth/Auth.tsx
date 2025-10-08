import { 
  RegisterDto, 
  LoginDto, 
  TokenActionRequestDto, 
  TokenVerifyDto, 
  AddRoleDto, 
  AuthResponseDto, 
  TokenVerifyResponseDto 
} from '@/lib/types/auth/Auth';

export const authService = {
  async register(body: RegisterDto): Promise<void> {
    const res = await fetch(`/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Registration failed: ${res.statusText} - ${errorText}`);
    }
  },

  async login(body: LoginDto): Promise<AuthResponseDto> {
    const res = await fetch(`/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Login failed: ${res.statusText} - ${errorText}`);
    }
    
    return await res.json();
  },

  async refreshToken(body: TokenActionRequestDto): Promise<AuthResponseDto> {
    const res = await fetch(`/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Token refresh failed: ${res.statusText} - ${errorText}`);
    }
    
    return await res.json();
  },

  async logout(body: TokenActionRequestDto): Promise<void> {
    const res = await fetch(`/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Logout failed: ${res.statusText} - ${errorText}`);
    }
  },

  async verifyToken(body: TokenVerifyDto): Promise<TokenVerifyResponseDto> {
    const res = await fetch(`/auth/verify-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Token verification failed: ${res.statusText} - ${errorText}`);
    }
    
    return await res.json();
  },

  async assignRole(body: AddRoleDto): Promise<void> {
    const res = await fetch(`/auth/assign-role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Role assignment failed: ${res.statusText} - ${errorText}`);
    }
  }
};