import { useState, useEffect } from 'react'
import { useSocket } from '@/lib/context/SocketContext'
import { UserService } from '@/lib/api/users/UserService'

export function useEnrichedSocketNotifications() {
  const { notifications: rawSocketNotifications } = useSocket()
  const [enrichedNotifications, setEnrichedNotifications] = useState<any[]>([])

  useEffect(() => {
    const enrichNotifications = async () => {
      if (rawSocketNotifications.length === 0) {
        setEnrichedNotifications([])
        return
      }

      try {
        // Lấy tất cả fromUserId từ socket notifications
        const userIds = [...new Set(
          rawSocketNotifications
            .map(n => n.fromUserId)
            .filter(id => id && id.trim() !== '')
        )]

        if (userIds.length === 0) {
          setEnrichedNotifications(rawSocketNotifications.map(n => ({ ...n, isFromSocket: true })))
          return
        }

        // Fetch user metadata
        const userMetadata = await UserService.getMultipleUsersMetadata(userIds)
        const userMap = new Map(userMetadata.map(user => [user.userId, user]))

        // Enrich socket notifications với user data
        const enriched = rawSocketNotifications.map(notification => {
          const userData = userMap.get(notification.fromUserId)
          return {
            ...notification,
            fromUser: userData ? {
              userId: userData.userId,
              username: `${userData.firstName} ${userData.lastName}`.trim(),
              displayName: `${userData.firstName} ${userData.lastName}`.trim(),
              avatarUrl: userData.avtUrl
            } : undefined,
            readFlag: false,
            isFromSocket: true
          }
        })

        setEnrichedNotifications(enriched)
      } catch (error) {
        console.error('Error enriching socket notifications:', error)
        setEnrichedNotifications(rawSocketNotifications.map(n => ({ ...n, isFromSocket: true })))
      }
    }

    enrichNotifications()
  }, [rawSocketNotifications])

  return enrichedNotifications
}
