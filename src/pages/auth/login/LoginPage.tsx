"use client"

import type React from "react"
import { useState } from "react"
import { Input, Button } from "@/components/ui"
import { Mail, Lock } from "lucide-react"
import { Link } from "react-router-dom"

export function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    setTimeout(() => {
      console.log("Login:", { email, password })
      setLoading(false)
    }, 1000)
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 h-11 text-base"
                  required
                />
              </div>
              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline underline-offset-4 transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
            </div>

            {/* Custom Button */}
            <Button
              type="submit"
              loading={loading}
              variant="primary"
              size="md"
              className="w-full h-11 text-base font-medium"
            >
              Login
            </Button>
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
              Don’t have an account?{" "}
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