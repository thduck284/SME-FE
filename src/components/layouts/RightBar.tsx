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
    <aside className="w-64 h-screen bg-gray-200 border-l border-gray-300 flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-gray-300">
        <h2 className="font-semibold text-black text-xl">Friends</h2>
      </div>
      
      {/* Friends list với scroll */}
      <div className="flex-1 overflow-y-auto">
        <ul className="space-y-3 p-5">
          {friends.map((friend) => (
            <li
              key={friend.id}
              className="flex items-center gap-3 p-3 hover:bg-gray-300 rounded-lg cursor-pointer transition-colors"
            >
              <div className="relative">
                <Avatar 
                  src={friend.avatar} 
                  alt={friend.name}
                  fallback={
                    friend.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                  }
                  className="w-12 h-12"
                />
                {friend.status === "online" && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-medium text-black truncate">{friend.name}</p>
                <p className="text-sm text-gray-700 capitalize">{friend.status}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}