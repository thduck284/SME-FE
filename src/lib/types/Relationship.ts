export enum RelationshipType {
  FOLLOWING = 'FOLLOWING',
  FRIEND = 'FRIEND',
  BLOCKED = 'BLOCKED'
}

export interface UserRelationshipDto {
  userId: string;
  relationshipTypes: RelationshipType[];
}

export interface UserRelationshipsResponseDto {
  users: UserRelationshipDto[];
  total: number;
}

export interface RelationshipSuggestion {
  userId: string;
  mutualCount: number;
  mutualUserIds: string[];
}

export interface RelationshipResponse {
  success: boolean;
  message: string;
  data: RelationshipSuggestion[];
}

export interface RelationshipDto {
  id: string;
  fromUserId: string;
  toUserId: string;
  type: string;
  createdAt: string;
}