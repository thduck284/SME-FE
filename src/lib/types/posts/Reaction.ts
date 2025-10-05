export interface ReactionMeta {
  userReaction: string | null;
  counters: Record<string, number>;
}

export interface ReactionsMetaResponse {
  [targetId: string]: ReactionMeta;
}

export interface ReactDto {
  targetId: string;
  targetType: string;
  userId: string;
  reactionType: string;
}

export enum ReactionType {
  LIKE = 'LIKE',
  LOVE = 'LOVE',
  HAHA = 'HAHA',
  WOW = 'WOW',
  SAD = 'SAD',
  ANGRY = 'ANGRY'
}

export enum ReactionTarget {
  POST = 'POST',
  COMMENT = 'COMMENT'
}