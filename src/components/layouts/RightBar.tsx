"use client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui"

const friends = [
  { id: 1, name: "John Doe", avatar: "/diverse-group.png", status: "online" },
  { id: 2, name: "Jane Smith", avatar: "/diverse-woman-portrait.png", status: "online" },
  { id: 3, name: "Mike Johnson", avatar: "/man.jpg", status: "offline" },
  { id: 4, name: "Sarah Williams", avatar: "/young-woman-smiling.png", status: "online" },
  { id: 5, name: "Tom Brown", avatar: "/young-boy-drawing.png", status: "offline" },
  { id: 6, name: "Emily Davis", avatar: "/lady.jpg", status: "online" },
]

export function RightBar() {
  return (
    <aside className="w-64 bg-white border-l border-gray-200 p-4 hidden lg:block">
      <h2 className="font-semibold text-gray-800 mb-4">Friends</h2>
      <ul className="space-y-3">
        {friends.map((friend) => (
          <li
            key={friend.id}
            className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
          >
            <div className="relative">
              <Avatar className="w-10 h-10">
                <AvatarImage src={friend.avatar || "/placeholder.svg"} alt={friend.name} />
                <AvatarFallback>
                  {friend.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
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
    </aside>
  )
}
