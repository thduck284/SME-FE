import apiClient from "@/lib/services/ApiClient"

export interface ReactionDetail {
  userId: string
  reactionType: string
  createdAt: string
}

export interface ReactionDetailsResponse {
  targetId: string
  targetType: string
  reactionDetails: ReactionDetail[]
  counters: Record<string, number>
  totalReactions: number
}

export const getReactionDetails = async (targetId: string, targetType: string = 'POST'): Promise<ReactionDetailsResponse> => {
  const response = await apiClient.get(`/reaction/details/${targetId}/${targetType}`)
  return response.data
}
