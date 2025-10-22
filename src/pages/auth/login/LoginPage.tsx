"use client"

import type React from "react"
import { useState } from "react"
import { Input, Button } from "@/components/ui"
import { Mail, Lock, Eye, EyeOff } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from '@/lib/hooks/useAuth'

export function LoginPage() {
  const navigate = useNavigate();
  const { loading, error, login, clearError } = useAuth();
  
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [loginAttempts, setLoginAttempts] = useState(0); 

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (error) clearError();
    if (successMessage) setSuccessMessage("");
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const loginData = {
      email: formData.email,
      password: formData.password,
    };

    const result = await login(loginData);
    
    if (result.success) {
      setSuccessMessage("Login successful! Redirecting to home page...");
      setLoginAttempts(0); // Reset số lần thất bại khi đăng nhập thành công
      setTimeout(() => {
        navigate('/home');
      }, 500);
    } else {
      setLoginAttempts(prev => prev + 1);
      if (loginAttempts >= 2) {
        setTimeout(() => {
          alert("Multiple login failures. Please check your credentials or reset your password.");
        }, 100);
      }
    }
  }

  // HÀM MỚI: Mở forgot password trong tab mới
  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    // Mở tab mới với forgot password page
    window.open('/forgot-password', '_blank');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-tr from-blue-100 via-purple-100 to-pink-100">
      {/* Background Blur Shapes */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-300/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-pink-200/20 rounded-full blur-2xl animate-pulse" />
      </div>

      <div className="w-full max-w-[480px]">
        {/* Login Card with Logo */}
        <div className="bg-card border border-border rounded-2xl p-8 md:p-10 shadow-sm backdrop-blur-sm">
          
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src="/assets/images/logo.svg"
              alt="Streamora Logo"
              className="w-60 h-auto"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm flex items-center gap-2 text-red">
                {error}
              </p>
              {loginAttempts > 0 && (
                <p className="text-destructive/80 text-xs mt-1 text-red">
                  Failed attempts: {loginAttempts}
                </p>
              )}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm font-medium flex items-center gap-2">
                <span>✅</span>
                {successMessage}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-[18px] h-[18px]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your_email@email.com"
                  value={formData.email}
                  onChange={handleChange('email')}
                  className="pl-11 h-11 text-base"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-[18px] h-[18px]" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange('password')}
                  className="pl-11 pr-11 h-11 text-base"
                  required
                />
                {/* CON MẮT HIỂN THỊ MẬT KHẨU */}
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-[18px] h-[18px]" />
                  ) : (
                    <Eye className="w-[18px] h-[18px]" />
                  )}
                </button>
              </div>
              <div className="flex justify-between items-center">
                {/* SỬA LINK FORGOT PASSWORD - MỞ TAB MỚI */}
                <a
                  href="/forgot-password"
                  onClick={handleForgotPassword}
                  className="text-sm text-primary hover:underline underline-offset-4 transition-colors cursor-pointer"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Forgot Password?
                </a>
                {loginAttempts > 1 && (
                  <span className="text-xs text-destructive">
                    {3 - loginAttempts > 0 
                      ? `${3 - loginAttempts} attempts remaining` 
                      : 'Account temporarily locked'
                    }
                  </span>
                )}
              </div>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={loading || loginAttempts >= 3} // Vô hiệu hóa sau 3 lần thất bại
              className="w-full h-11 text-base font-medium bg-primary hover:bg-primary/90"
            >
              {loading ? "Logging in..." : 
               loginAttempts >= 3 ? "Account Locked" : "Login"}
            </Button>

            {/* Thông báo khóa tài khoản tạm thời */}
            {loginAttempts >= 3 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-700 text-sm">
                  ⚠️ Your account has been temporarily locked due to multiple failed attempts. 
                  Please try again in 15 minutes or{' '}
                  <a
                    href="/forgot-password"
                    onClick={handleForgotPassword}
                    className="font-semibold underline underline-offset-2 cursor-pointer"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    reset your password
                  </a>.
                </p>
              </div>
            )}
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground font-medium">
                Or
              </span>
            </div>
          </div>

          {/* Sign up */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-semibold text-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            By logging in, you agree to our{" "}
            <Link
              to="/terms"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              to="/privacy"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}