"use client"
import { LeftBar, RightBar } from "@/components/layouts"

export function HomePage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Sidebar */}
      <LeftBar />

      {/* Main Feed */}
      <main className="flex-1 bg-gray-50 p-6">
        {/* Feed content */}
      </main>

      {/* Right Sidebar */}
      <RightBar />
    </div>
  )
}
