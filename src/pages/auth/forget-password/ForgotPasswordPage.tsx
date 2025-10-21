"use client"

import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from "@/components/ui"
import { Link } from "react-router-dom"

export function ForgotPasswordPage() {
  const { 
    loading, 
    error, 
    success, 
    forgotPassword, 
    clearError, 
    clearSuccess 
  } = useAuth()

  const handleResetPassword = async () => {
    clearError()
    clearSuccess()
    
    const result = await forgotPassword()
    
    if (!result.success) {
      // Error đã được set tự động trong hook
      console.error('Forgot password failed:', result)
    }
    // Nếu success, hook đã tự động redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-tr from-blue-100 via-purple-100 to-pink-100">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-300/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-pink-200/20 rounded-full blur-2xl animate-pulse" />
      </div>

      <div className="w-full max-w-[480px]">
        <div className="bg-card border border-border rounded-2xl p-8 md:p-10 shadow-sm backdrop-blur-sm">
          
          <div className="flex justify-center mb-6">
            <img src="/assets/images/logo.svg" alt="Logo" className="w-60 h-auto" />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-3">
              Forgot Password?
            </h1>
            <p className="text-muted-foreground">
              Click below to reset your password securely
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">
                ❌ {error}
              </p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm font-medium">
                ✅ {success}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <Button
              onClick={handleResetPassword}
              disabled={loading}
              className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Redirecting to Secure Portal...
                </div>
              ) : (
                "Reset My Password"
              )}
            </Button>

            <div className="text-center text-xs text-muted-foreground">
              <p>You'll be redirected to our secure password reset page</p>
            </div>
          </div>

          <div className="text-center mt-8 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Remember your password?{" "}
              <Link
                to="/login"
                className="font-semibold text-foreground hover:text-blue-600 transition-colors underline-offset-4 hover:underline"
              >
                Back to Login
              </Link>
            </p>
          </div>
        </div>

        {/* Debug Info */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Using secure authentication system
          </p>
        </div>
      </div>
    </div>
  )
}