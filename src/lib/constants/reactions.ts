import {
  ThumbsUp,
  Heart,
  Laugh,
  Frown,
  Angry,
  CircleDashed, // use this as "Wow"
} from "lucide-react"

export enum ReactionType {
  LIKE = 'LIKE',
  LOVE = 'LOVE',
  HAHA = 'HAHA',
  WOW = 'WOW',
  SAD = 'SAD',
  ANGRY = 'ANGRY'
}

export const reactionIcons: Record<ReactionType, { icon: any; label: string; color: string; bg: string; darkBg: string }> = {
  [ReactionType.LIKE]:  { icon: ThumbsUp,    label: "Like",  color: "text-green-600",  bg: "bg-green-50",   darkBg: "dark:bg-green-950/30" },
  [ReactionType.LOVE]:  { icon: Heart,       label: "Love",  color: "text-red-600",    bg: "bg-red-50",     darkBg: "dark:bg-red-950/30" },
  [ReactionType.HAHA]:  { icon: Laugh,       label: "Haha",  color: "text-yellow-600", bg: "bg-yellow-50",  darkBg: "dark:bg-yellow-950/30" },
  [ReactionType.WOW]:   { icon: CircleDashed,label: "Wow",   color: "text-yellow-600", bg: "bg-yellow-50",  darkBg: "dark:bg-yellow-950/30" },
  [ReactionType.SAD]:   { icon: Frown,       label: "Sad",   color: "text-yellow-600", bg: "bg-yellow-50",  darkBg: "dark:bg-yellow-950/30" },
  [ReactionType.ANGRY]: { icon: Angry,       label: "Angry", color: "text-red-600",    bg: "bg-red-50",     darkBg: "dark:bg-red-950/30" },
}
