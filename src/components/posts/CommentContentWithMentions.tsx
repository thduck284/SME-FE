"use client"

import { useState, useEffect } from "react"
import { UserService } from "@/lib/api/users/UserService"
import type { CommentMention } from "@/lib/types/posts/CommentsDTO"
import type { UserMetadata } from "@/lib/types/User"

interface CommentContentWithMentionsProps {
  content: string
  mentions?: CommentMention[]
  onMentionClick?: (path: string) => void
}

export function CommentContentWithMentions({ 
  content, 
  mentions, 
  onMentionClick 
}: CommentContentWithMentionsProps) {
  const [userCache, setUserCache] = useState<Map<string, UserMetadata>>(new Map())

  // Fetch user metadata for all mentions
  useEffect(() => {
    if (!mentions || mentions.length === 0) return

    const fetchUserMetadata = async () => {
      // Get unique user IDs that we haven't fetched yet
      const userIdsToFetch = mentions
        .map(m => m.userId)
        .filter((userId, index, self) => self.indexOf(userId) === index)
        .filter(userId => !userCache.has(userId))

      if (userIdsToFetch.length === 0) {
        return
      }

      try {
        // Fetch all user metadata in parallel
        const userPromises = userIdsToFetch.map(async (userId) => {
          try {
            const metadata = await UserService.getUserMetadata(userId)
            return { userId, metadata }
          } catch (error) {
            console.error('Failed to fetch user metadata for mention:', error)
            return {
              userId,
              metadata: {
                userId,
                firstName: 'User',
                lastName: userId.slice(0, 8),
                avtUrl: null
              }
            }
          }
        })

        const results = await Promise.all(userPromises)
        
        // Update cache with all results
        setUserCache(prevCache => {
          const updatedCache = new Map(prevCache)
          results.forEach(({ userId, metadata }) => {
            updatedCache.set(userId, metadata)
          })
          return updatedCache
        })
      } catch (error) {
        console.error('Error fetching user metadata:', error)
      }
    }

    fetchUserMetadata()
  }, [mentions])

  // Function to render content with hashtag highlighting
  const renderContentWithHashtags = (text: string) => {
    if (!text) return text
    
    // Regex to match hashtags (#word)
    const hashtagRegex = /#(\w+)/g
    const parts: (string | JSX.Element)[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null
    
    while ((match = hashtagRegex.exec(text)) !== null) {
      // Add text before hashtag
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index))
      }
      
      // Store hashtag value to avoid null reference
      const hashtagValue = match[1]
      const fullHashtag = match[0]
      
      // Add hashtag with highlighting
      parts.push(
        <span
          key={match.index}
          className="text-purple-600 dark:text-purple-400 font-semibold hover:underline cursor-pointer bg-purple-50 dark:bg-purple-900/20 px-1 py-0.5 rounded transition-all duration-200 hover:bg-purple-100 dark:hover:bg-purple-900/30"
          title={`#${hashtagValue}`}
          onClick={() => {
            // Navigate to hashtag page
            window.location.href = `/hashtag/${hashtagValue}`
          }}
        >
          {fullHashtag}
        </span>
      )
      
      lastIndex = match.index + match[0].length
    }
    
    // Add remaining text after last hashtag
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }
    
    return parts.length > 0 ? parts : text
  }

  // Render content with highlighted mentions and hashtags
  const renderContent = () => {
    if (!mentions || mentions.length === 0) {
      return <span className="text-sm text-foreground bg-background rounded-lg p-3 whitespace-pre-wrap break-words block">{renderContentWithHashtags(content)}</span>
    }

    // Sort mentions by startIndex to process them in order
    const sortedMentions = [...mentions].sort((a, b) => a.startIndex - b.startIndex)
    
    const parts: Array<{
      type: 'text' | 'mention'
      content: string
      startIndex: number
      endIndex: number
      userId?: string
    }> = []
    let lastIndex = 0

    sortedMentions.forEach((mention) => {
      // Add text before mention
      if (mention.startIndex > lastIndex) {
        parts.push({
          type: 'text',
          content: content.slice(lastIndex, mention.startIndex),
          startIndex: lastIndex,
          endIndex: mention.startIndex
        })
      }

      // Add mention
      const userMetadata = userCache.get(mention.userId)
      const displayName = userMetadata 
        ? `${userMetadata.firstName} ${userMetadata.lastName}`.trim()
        : `@user${mention.userId.slice(0, 8)}`

      parts.push({
        type: 'mention',
        content: `@${displayName}`,
        userId: mention.userId,
        startIndex: mention.startIndex,
        endIndex: mention.endIndex
      })

      lastIndex = mention.endIndex
    })

    // Add remaining text after last mention
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex),
        startIndex: lastIndex,
        endIndex: content.length
      })
    }

    return (
      <span className="text-sm text-foreground bg-background rounded-lg p-3 whitespace-pre-wrap break-words block">
        {parts.map((part, index) => {
          if (part.type === 'mention') {
            return (
              <span
                key={index}
                className="text-blue-600 dark:text-blue-400 font-medium cursor-pointer hover:underline"
                onClick={() => {
                  if (onMentionClick && part.userId) {
                    onMentionClick(`/profile/${part.userId}`)
                  }
                }}
              >
                {part.content}
              </span>
            )
          }
          return <span key={index}>{renderContentWithHashtags(part.content)}</span>
        })}
      </span>
    )
  }

  return renderContent()
}