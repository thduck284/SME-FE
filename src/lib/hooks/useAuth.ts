import { useState } from 'react';
import { authService } from '@/lib/api/auth/Auth';
import { RegisterDto, LoginDto, AddRoleDto } from '@/lib/types/auth/Auth';

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
        // Tìm JSON trong error message
        const jsonMatch = err?.message?.match(/\{.*\}/);
        if (jsonMatch) {
          const errorData = JSON.parse(jsonMatch[0]);
          message = errorData.message || message;
        } else {
          message = err?.message || message;
        }
      } catch {
        // Nếu parse JSON thất bại, dùng message gốc
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
      setSuccess('Login successful!');
      return { success: true, data: result };
    } catch (err: any) {
      // Sử dụng message từ API
      const message = 'Login failed';
      setError(message);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const logout = async (refreshToken: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await authService.logout({ refreshToken });
      setSuccess('Logout successful!');
      return { success: true };
    } catch (err: any) {
      // Sử dụng message từ API
      const message = 'Logout failed';
      setError(message);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const refreshToken = async (refreshToken: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await authService.refreshToken({ refreshToken });
      setSuccess('Token refreshed successfully!');
      return { success: true, data: result };
    } catch (err: any) {
      // Sử dụng message từ API
      const message = err?.message || 'Token refresh failed';
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
      // Sử dụng message từ API
      const message = err?.message || 'Token verification failed';
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
      // Sử dụng message từ API
      const message = err?.message || 'Role assignment failed';
      setError(message);
      return { success: false };
    } finally {
      setLoading(false);
    }
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
    refreshToken,
    verifyToken,
    assignRole,
  };
};