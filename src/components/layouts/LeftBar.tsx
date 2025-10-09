"use client"

import { useState } from "react"
import { Home, Search, Compass, Film, MessageCircle, Bell, PlusSquare, User, MoreHorizontal, UserPlus } from "lucide-react"
import { CreatePostModal } from "@/components/posts/CreatePostModal"
import { Link } from "react-router-dom"

export function LeftBar() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <aside className="w-64 h-screen bg-gradient-to-b from-orange-50 via-white to-orange-50/30 border-r border-orange-200/50 hidden md:flex flex-col shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-center p-6 border-b border-orange-200/50">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 text-transparent bg-clip-text tracking-tight">
            Streamora
          </h1>
        </div>

        {/* Navigation với scroll */}
        <div className="flex-1 overflow-y-auto p-6">
          <nav className="space-y-1">
            <Link
              to="/home"
              className="flex items-center gap-4 px-4 py-3.5 text-orange-700 bg-orange-100 rounded-xl transition-all duration-300 shadow-sm font-medium group"
            >
              <Home className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span>Home</span>
            </Link>

            <a
              href="#"
              className="flex items-center gap-4 px-4 py-3.5 text-gray-700 hover:text-orange-700 hover:bg-orange-50 rounded-xl transition-all duration-300 font-medium group"
            >
              <Search className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span>Search</span>
            </a>

            <a
              href="#"
              className="flex items-center gap-4 px-4 py-3.5 text-gray-700 hover:text-orange-700 hover:bg-orange-50 rounded-xl transition-all duration-300 font-medium group"
            >
              <Compass className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span>Explore</span>
            </a>

            <a
              href="#"
              className="flex items-center gap-4 px-4 py-3.5 text-gray-700 hover:text-orange-700 hover:bg-orange-50 rounded-xl transition-all duration-300 font-medium group"
            >
              <Film className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span>Reels</span>
            </a>

            <a
              href="#"
              className="flex items-center gap-4 px-4 py-3.5 text-gray-700 hover:text-orange-700 hover:bg-orange-50 rounded-xl transition-all duration-300 font-medium group"
            >
              <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span>Messages</span>
            </a>

            <a
              href="#"
              className="flex items-center gap-4 px-4 py-3.5 text-gray-700 hover:text-orange-700 hover:bg-orange-50 rounded-xl transition-all duration-300 font-medium group"
            >
              <Bell className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span>Notifications</span>
            </a>

            {/* Create Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-4 px-4 py-3.5 text-gray-700 hover:text-orange-700 hover:bg-orange-50 rounded-xl transition-all duration-300 font-medium group w-full"
            >
              <PlusSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span>Create</span>
            </button>

            <Link 
              to="/profile" 
              className="flex items-center gap-4 px-4 py-3.5 text-gray-700 hover:text-orange-700 hover:bg-orange-50 rounded-xl transition-all duration-300 font-medium group"
            >
              <User className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span>Profile</span>
            </Link>

            <Link
              to="/suggested"
              className="flex items-center gap-4 px-4 py-3.5 text-gray-700 hover:text-orange-700 hover:bg-orange-50 rounded-xl transition-all duration-300 font-medium group"
            >
              <UserPlus className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span>Gợi ý kết bạn</span>
            </Link>

            <a
              href="#"
              className="flex items-center gap-4 px-4 py-3.5 text-gray-700 hover:text-orange-700 hover:bg-orange-50 rounded-xl transition-all duration-300 font-medium group"
            >
              <MoreHorizontal className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span>More</span>
            </a>
          </nav>
        </div>
      </aside>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPostCreated={() => console.log("Post created")}
        currentUserId="572a51cc-38a3-4225-a7f2-203a514293f5" // TODO: Get from auth context
      />
    </>
  )
}