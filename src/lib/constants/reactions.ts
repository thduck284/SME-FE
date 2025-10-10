export enum ReactionType {
  LIKE = 'LIKE',
  LOVE = 'LOVE',
  HAHA = 'HAHA',
  WOW = 'WOW',
  SAD = 'SAD',
  ANGRY = 'ANGRY'
}

export const reactionIcons: Record<ReactionType, { 
  icon: any;  
  label: string; 
  color: string; 
  bg: string; 
  darkBg: string;
}> = {
  [ReactionType.LIKE]:  { 
    icon: "👍",  
    label: "Like",  
    color: "text-green-600",  
    bg: "bg-green-50",   
    darkBg: "dark:bg-green-950/30" 
  },
  [ReactionType.LOVE]:  { 
    icon: "❤️", 
    label: "Love",  
    color: "text-red-600",    
    bg: "bg-red-50",     
    darkBg: "dark:bg-red-950/30" 
  },
  [ReactionType.HAHA]:  { 
    icon: "😂",  
    label: "Haha",  
    color: "text-yellow-600", 
    bg: "bg-yellow-50",  
    darkBg: "dark:bg-yellow-950/30" 
  },
  [ReactionType.WOW]:   { 
    icon: "😮",  
    label: "Wow",   
    color: "text-yellow-600", 
    bg: "bg-yellow-50",  
    darkBg: "dark:bg-yellow-950/30" 
  },
  [ReactionType.SAD]:   { 
    icon: "😢",  
    label: "Sad",   
    color: "text-yellow-600", 
    bg: "bg-yellow-50",  
    darkBg: "dark:bg-yellow-950/30" 
  },
  [ReactionType.ANGRY]: { 
    icon: "😡",  
    label: "Angry", 
    color: "text-red-600",    
    bg: "bg-red-50",     
    darkBg: "dark:bg-red-950/30" 
  },
}