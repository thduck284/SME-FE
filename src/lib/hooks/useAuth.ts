import { useState } from 'react'
import { useAuthContext } from '@/lib/context/AuthContext'
import { authService } from '@/lib/api/auth/Auth'
import { RegisterDto, LoginDto, AddRoleDto } from '@/lib/types/auth/Auth'

export const useAuth = () => {
  const { accessToken, setAccessToken, userId } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const register = async (data: RegisterDto) => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      await authService.register(data)
      setSuccess('Registration successful!')
      return { success: true }
    } catch (err: any) {
      setError(err?.message || 'Registration failed')
      return { success: false }
    } finally {
      setLoading(false)
    }
  }

  const login = async (data: LoginDto) => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await authService.login(data)
      setAccessToken(result.accessToken)
      setSuccess('Login successful!')
      return { success: true, data: result }
    } catch (err: any) {
      setError(err?.message || 'Login failed')
      return { success: false }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      if (accessToken) {
        await authService.logout({ refreshToken: accessToken })
      }
      setAccessToken(null)
      setSuccess('Logout successful!')
      return { success: true }
    } catch {
      setAccessToken(null)
      setError('Logout failed')
      return { success: false }
    } finally {
      setLoading(false)
    }
  }

  const refreshToken = async (refreshTokenValue: string) => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await authService.refreshToken({ refreshToken: refreshTokenValue })
      setAccessToken(result.accessToken)
      setSuccess('Token refreshed successfully!')
      return { success: true, data: result }
    } catch {
      setError('Token refresh failed')
      return { success: false }
    } finally {
      setLoading(false)
    }
  }

  const assignRole = async (data: AddRoleDto) => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      await authService.assignRole(data)
      setSuccess('Role assigned successfully!')
      return { success: true }
    } catch {
      setError('Role assignment failed')
      return { success: false }
    } finally {
      setLoading(false)
    }
  }

  const isAuthenticated = () => !!accessToken
  const clearError = () => setError(null)
  const clearSuccess = () => setSuccess(null)

  return {
    userId,
    accessToken,
    loading,
    error,
    success,
    register,
    login,
    logout,
    refreshToken,
    assignRole,
    isAuthenticated,
    clearError,
    clearSuccess,
  }
}
