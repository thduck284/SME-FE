"use client"

import { Link } from 'react-router-dom'
import { ArrowLeft, Home } from 'lucide-react'

export function ChatHeader() {
  return (
    <div className="flex items-center justify-between py-2 px-3 border-b border-gray-200 bg-gray-200 shadow-sm flex-shrink-0">
      <div className="flex items-center gap-4">
        <Link
          to="/home"
          className="p-2 hover:bg-gray-300 rounded-lg transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <Home className="w-5 h-5" />
          <span className="font-medium">Back to home</span>
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold">Messages</h2>
      </div>
    </div>
  )
}




