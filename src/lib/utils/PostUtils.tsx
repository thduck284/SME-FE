import { Globe, Lock, Users, UserPlus } from "lucide-react"
import type { CreatePostDto } from "@/lib/types/Post"
import React from "react"

export function getVisibilityIcon(visibility?: CreatePostDto["visibility"]): React.ReactElement {
  switch (visibility) {
    case "PUBLIC":
      return <Globe className="w-4 h-4" />
    case "PRIVATE":
      return <Lock className="w-4 h-4" />
    case "FRIEND":
      return <Users className="w-4 h-4" />
    case "FOLLOWER":
      return <UserPlus className="w-4 h-4" />
    default:
      return <Globe className="w-4 h-4" />
  }
}

export const VISIBILITY_OPTIONS: { value: CreatePostDto["visibility"]; label: string }[] = [
  { value: "PUBLIC", label: "Public" },
  { value: "PRIVATE", label: "Only me" },
  { value: "FRIEND", label: "Friends" },
  { value: "FOLLOWER", label: "Followers" },
]