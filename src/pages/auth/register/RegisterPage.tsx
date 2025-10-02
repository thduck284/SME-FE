"use client"

import type React from "react"
import { useState } from "react"
import { Input, Button } from "@/components/ui"
import { Link } from "react-router-dom"

export function RegisterPage() {
  const [firstName, setFirstName] = useState("")
  const [surname, setSurname] = useState("")
  const [dob, setDob] = useState("")
  const [gender, setGender] = useState("Female")
  const [emailOrMobile, setEmailOrMobile] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    setTimeout(() => {
      console.log("Register:", { firstName, surname, dob, gender, emailOrMobile, password })
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

            {/* First Name & Surname */}
            <div className="flex gap-4">
              {/* First Name */}
              <div className="flex-1 space-y-2">
                <label htmlFor="firstName" className="block text-sm font-medium text-foreground">
                  First Name
                </label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Your first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-11 text-base"
                  required
                />
              </div>

              {/* Surname */}
              <div className="flex-1 space-y-2">
                <label htmlFor="surname" className="block text-sm font-medium text-foreground">
                  Surname
                </label>
                <Input
                  id="surname"
                  type="text"
                  placeholder="Your surname"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  className="h-11 text-base"
                  required
                />
              </div>
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <label htmlFor="dob" className="block text-sm font-medium text-foreground">
                Date of Birth
              </label>
              <Input
                id="dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="h-11 text-base"
                required
              />
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Gender</label>
              <div className="flex gap-4">
                {["Female", "Male"].map((g) => (
                  <label key={g} className="flex items-center gap-1 text-sm text-foreground">
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={gender === g}
                      onChange={() => setGender(g)}
                      className="w-4 h-4 accent-primary"
                    />
                    {g}
                  </label>
                ))}
              </div>
            </div>

            {/* Email or Mobile */}
            <div className="space-y-2">
              <label htmlFor="emailOrMobile" className="block text-sm font-medium text-foreground">
                Mobile number or email address
              </label>
              <Input
                id="emailOrMobile"
                type="text"
                placeholder="Enter mobile or email"
                value={emailOrMobile}
                onChange={(e) => setEmailOrMobile(e.target.value)}
                className="h-11 text-base"
                required
              />
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                New Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 text-base"
                required
              />
            </div>

            {/* Register Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-base font-medium"
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
