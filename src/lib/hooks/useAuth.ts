import { useState } from 'react';
import { authService } from '@/lib/api/auth/Auth';
import { RegisterDto, LoginDto, AddRoleDto } from '@/lib/types/auth/Auth';

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const storeTokens = (result: any) => {
    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);
    localStorage.setItem('tokenExpires', (Date.now() + result.expiresIn * 1000).toString());
  };

  const clearTokens = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpires');
  };

  const refreshToken = async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      clearTokens();
      return false;
    }

    try {
      const result = await authService.refreshToken({ refreshToken });
      storeTokens(result);
      return true;
    } catch (error) {
      clearTokens();
      return false;
    }
  };

  const register = async (data: RegisterDto) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 4000); 
      });

      const registerPromise = authService.register(data);
      
      await Promise.race([registerPromise, timeoutPromise]);
      setSuccess('Registration successful!');
      return { success: true };
      
    } catch (err: any) {
      // Parse JSON message từ API
      let message = 'Registration failed';
      
      try {
        const jsonMatch = err?.message?.match(/\{.*\}/);
        if (jsonMatch) {
          const errorData = JSON.parse(jsonMatch[0]);
          message = errorData.message || message;
        } else {
          message = err?.message || message;
        }
      } catch {
        message = err?.message || message;
      }
      
      setError(message);
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
      
      // Store tokens after successful login
      storeTokens(result);
      
      setSuccess('Login successful!');
      return { success: true, data: result };
    } catch (err: any) {
      // Parse JSON message từ API
      let message = 'Login failed';
      
      try {
        const jsonMatch = err?.message?.match(/\{.*\}/);
        if (jsonMatch) {
          const errorData = JSON.parse(jsonMatch[0]);
          message = errorData.message || message;
        } else {
          message = err?.message || message;
        }
      } catch {
        message = err?.message || message;
      }
      
      setError(message);
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
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await authService.logout({ refreshToken });
      }
      
      // Clear tokens from storage
      clearTokens();
      
      setSuccess('Logout successful!');
      return { success: true };
    } catch (err: any) {
      // Even if logout API fails, clear local tokens
      clearTokens();
      
      const message = 'Logout failed';
      setError(message);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const refreshTokenMethod = async (refreshToken: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await authService.refreshToken({ refreshToken });
      setSuccess('Token refreshed successfully!');
      return { success: true, data: result };
    } catch (err: any) {
      const message = 'Token refresh failed';
      setError(message);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const verifyToken = async (token: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await authService.verifyToken({ token });
      setSuccess('Token verified successfully!');
      return { success: true, data: result };
    } catch (err: any) {
      const message = 'Token verification failed';
      setError(message);
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
    } catch (err: any) {
      const message = 'Role assignment failed';
      setError(message);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // Check if user is authenticated
  const isAuthenticated = (): boolean => {
    const token = localStorage.getItem('accessToken');
    const expires = localStorage.getItem('tokenExpires');
    
    if (!token || !expires) return false;
    
    // Check if token is expired
    return Date.now() < parseInt(expires);
  };

  // Get current access token
  const getAccessToken = (): string | null => {
    return localStorage.getItem('accessToken');
  };

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
    refreshToken: refreshTokenMethod,
    verifyToken,
    assignRole,
    isAuthenticated,
    getAccessToken,
    autoRefreshToken: refreshToken, // Internal auto refresh
  };
};