"use client"

import type React from "react"
import { useState } from "react"
import { Input, Button } from "@/components/ui"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from '@/lib/hooks/useAuth'

export function RegisterPage() {
  const navigate = useNavigate();
  const { loading, error, register, clearError } = useAuth();
  
  const [formData, setFormData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    gender: "Female",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (error) clearError();
    if (successMessage) setSuccessMessage("");
  };

  const handleGenderChange = (gender: string) => {
    setFormData(prev => ({ ...prev, gender }));
    if (error) clearError();
    if (successMessage) setSuccessMessage("");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!")
      return
    }

    // Check password length
    if (formData.password.length < 6) {
      alert("Password must be at least 6 characters long!")
      return
    }

    // Prepare data for API
    const registerData = {
      username: formData.username,
      firstName: formData.firstName,
      lastName: formData.lastName,
      gender: formData.gender,
      email: formData.email,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
    };

    const result = await register(registerData);
    
    if (result.success) {
      setSuccessMessage("Registration successful! Redirecting to login page...");
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-tr from-blue-100 via-purple-100 to-pink-100">
      
      {/* Background Blur Shapes */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-300/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-pink-200/20 rounded-full blur-2xl animate-pulse" />
      </div>

      <div className="w-full max-w-[480px]">
        {/* Register Card */}
        <div className="bg-card border border-border rounded-2xl p-8 md:p-10 shadow-sm backdrop-blur-sm">
          
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src="/assets/images/logo.svg"
              alt="Streamora Logo"
              className="w-60 h-auto"
            />
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-6">

            {/* Username */}
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-medium text-foreground">
                Username *
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleChange('username')}
                className="h-11 text-base"
                required
              />
            </div>

            {/* First Name & Last Name */}
            <div className="flex gap-4">
              {/* First Name */}
              <div className="flex-1 space-y-2">
                <label htmlFor="firstName" className="block text-sm font-medium text-foreground">
                  First Name *
                </label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Your first name"
                  value={formData.firstName}
                  onChange={handleChange('firstName')}
                  className="h-11 text-base"
                  required
                />
              </div>

              {/* Last Name */}
              <div className="flex-1 space-y-2">
                <label htmlFor="lastName" className="block text-sm font-medium text-foreground">
                  Last Name *
                </label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Your last name"
                  value={formData.lastName}
                  onChange={handleChange('lastName')}
                  className="h-11 text-base"
                  required
                />
              </div>
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Gender</label>
              <div className="flex gap-4">
                {["Female", "Male"].map((g) => (
                  <label key={g} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={formData.gender === g}
                      onChange={() => handleGenderChange(g)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span>{g}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email *
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange('email')}
                className="h-11 text-base"
                required
              />
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password *
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange('password')}
                className="h-11 text-base"
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">Password must be at least 6 characters long</p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
                Confirm Password *
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
                className="h-11 text-base"
                required
              />
            </div>

            {/* Messages - ĐẶT GẦN NÚT ĐĂNG KÝ */}
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 text-sm font-medium">{successMessage}</p>
              </div>
            )}

            {/* Register Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-base font-medium bg-primary hover:bg-primary/90"
            >
              {loading ? "Registering..." : "Register"}
            </Button>
          </form>

          {/* Sign in link */}
          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
              >
                Log In
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            By registering, you agree to our{" "}
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