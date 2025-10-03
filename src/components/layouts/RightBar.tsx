"use client"
import { Avatar } from "@/components/ui"

const friends = [
  { id: 1, name: "John Doe", avatar: "/image.png", status: "online" },
  { id: 2, name: "Jane Smith", avatar: "/image.png", status: "online" },
  { id: 3, name: "Mike Johnson", avatar: "/image.png", status: "offline" },
  { id: 4, name: "Sarah Williams", avatar: "/image.png", status: "online" },
  { id: 5, name: "Tom Brown", avatar: "/image.png", status: "offline" },
  { id: 6, name: "Emily Davis", avatar: "/image.png", status: "online" },
]

export function RightBar() {
  return (
    <aside className="w-64 h-screen bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800">Friends</h2>
      </div>
      
      {/* Friends list với scroll */}
      <div className="flex-1 overflow-y-auto">
        <ul className="space-y-3 p-4">
          {friends.map((friend) => (
            <li
              key={friend.id}
              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
            >
              <div className="relative">
                <Avatar 
                  src={friend.avatar || "/placeholder.svg"} 
                  alt={friend.name}
                  fallback={
                    friend.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                  }
                  className="w-10 h-10"
                />
                {friend.status === "online" && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{friend.name}</p>
                <p className="text-xs text-gray-500">{friend.status}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}