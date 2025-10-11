import { useState } from 'react';
import { authService } from '@/lib/api/auth/Auth';
import { RegisterDto, LoginDto, AddRoleDto } from '@/lib/types/auth/Auth';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const TOKEN_EXPIRES_KEY = 'tokenExpires';

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const storeTokens = (result: any) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, result.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
    localStorage.setItem(TOKEN_EXPIRES_KEY, (Date.now() + result.expiresIn * 1000).toString());
  };

  const clearTokens = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRES_KEY);
  };

  const autoRefreshToken = async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      clearTokens();
      return false;
    }

    try {
      const result = await authService.refreshToken({ refreshToken });
      storeTokens(result);
      return true;
    } catch {
      clearTokens();
      return false;
    }
  };

  const register = async (data: RegisterDto) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await authService.register(data);
      setSuccess('Registration successful!');
      return { success: true };
    } catch (err: any) {
      setError(err?.message || 'Registration failed');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const login = async (data: LoginDto) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await authService.login(data);
      storeTokens(result);
      setSuccess('Login successful!');
      return { success: true, data: result };
    } catch (err: any) {
      setError(err?.message || 'Login failed');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken) await authService.logout({ refreshToken });
      clearTokens();
      setSuccess('Logout successful!');
      return { success: true };
    } catch {
      clearTokens();
      setError('Logout failed');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const assignRole = async (data: AddRoleDto) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await authService.assignRole(data);
      setSuccess('Role assigned successfully!');
      return { success: true };
    } catch {
      setError('Role assignment failed');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const isAuthenticated = (): boolean => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    const expires = localStorage.getItem(TOKEN_EXPIRES_KEY);
    return !!token && !!expires && Date.now() < parseInt(expires);
  };

  const getAccessToken = (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY);

  const clearError = () => setError(null);
  const clearSuccess = () => setSuccess(null);

  return {
    loading,
    error,
    success,
    clearError,
    clearSuccess,
    register,
    login,
    logout,
    assignRole,
    isAuthenticated,
    getAccessToken,
    autoRefreshToken,
  };
};
