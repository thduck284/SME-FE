export enum ReactionType {
  LIKE = 'LIKE',
  LOVE = 'LOVE',
  HAHA = 'HAHA',
  WOW = 'WOW',
  SAD = 'SAD',
  ANGRY = 'ANGRY'
}

export const reactionIcons = {
  [ReactionType.LIKE]: { icon: "👍", label: "Like", color: "text-blue-500" },
  [ReactionType.LOVE]: { icon: "❤️", label: "Love", color: "text-red-500" },
  [ReactionType.HAHA]: { icon: "😄", label: "Haha", color: "text-yellow-500" },
  [ReactionType.WOW]: { icon: "😮", label: "Wow", color: "text-yellow-500" },
  [ReactionType.SAD]: { icon: "😢", label: "Sad", color: "text-blue-400" },
  [ReactionType.ANGRY]: { icon: "😠", label: "Angry", color: "text-orange-500" },
}