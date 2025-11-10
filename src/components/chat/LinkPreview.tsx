"use client"

import { useState, useEffect } from 'react'
import { ExternalLink, Globe } from 'lucide-react'

interface LinkPreviewProps {
  url: string
  isOwn: boolean
}

interface LinkMetadata {
  title?: string
  description?: string
  image?: string
  siteName?: string
  url: string
}

export function LinkPreview({ url, isOwn }: LinkPreviewProps) {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [faviconError, setFaviconError] = useState(false)

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true)
        
        // Try to fetch metadata from backend API
        // If API is not available, fallback to basic domain info
        try {
          // Option 1: Try backend API endpoint (if available)
          const apiResponse = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (apiResponse.ok) {
            const data = await apiResponse.json()
            setMetadata({
              title: data.title || data.ogTitle || extractDomain(url),
              description: data.description || data.ogDescription || '',
              image: data.image || data.ogImage || data.twitterImage || '',
              siteName: data.siteName || data.ogSiteName || extractDomain(url),
              url: url,
            })
            setLoading(false)
            return
          }
        } catch (apiError) {
          // API not available, continue to fallback
          console.log('Link preview API not available, using fallback')
        }

        // Fallback: Extract basic info from URL
        // This will work even without a backend API
        setMetadata({
          title: extractDomain(url),
          description: '',
          image: '',
          siteName: extractDomain(url),
          url: url,
        })
      } catch (err) {
        console.error('Error fetching link metadata:', err)
        // Final fallback: use basic info from URL
        setMetadata({
          title: extractDomain(url),
          description: '',
          image: '',
          siteName: extractDomain(url),
          url: url,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchMetadata()
    setFaviconError(false) // Reset favicon error when URL changes
  }, [url])

  const extractDomain = (url: string): string => {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname.replace('www.', '')
    } catch {
      return url
    }
  }

  const getFaviconUrl = (url: string): string => {
    try {
      const domain = extractDomain(url)
      // Use Google's favicon service as it's reliable and works for most websites
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
    } catch {
      return ''
    }
  }

  if (loading) {
    return (
      <div className={`mt-2 rounded-lg border overflow-hidden ${isOwn ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="p-3">
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-10 h-10 rounded animate-pulse ${isOwn ? 'bg-blue-200' : 'bg-gray-300'}`}></div>
            <div className="flex-1 space-y-2">
              <div className={`h-4 rounded w-3/4 animate-pulse ${isOwn ? 'bg-blue-200' : 'bg-gray-300'}`}></div>
              <div className={`h-3 rounded w-1/2 animate-pulse ${isOwn ? 'bg-blue-200' : 'bg-gray-300'}`}></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!metadata) return null

  return (
    <a
      href={metadata.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-2 block rounded-lg border overflow-hidden transition-all hover:shadow-md ${
        isOwn 
          ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {metadata.image && (
        <div className="relative w-full h-40 bg-gray-200 overflow-hidden">
          <img
            src={metadata.image}
            alt={metadata.title || 'Link preview'}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Hide image if it fails to load
              e.currentTarget.parentElement?.remove()
            }}
          />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Website Avatar/Favicon */}
          <div className="flex-shrink-0">
            {!faviconError ? (
              <img
                src={getFaviconUrl(metadata.url)}
                alt={metadata.siteName || extractDomain(metadata.url)}
                className="w-10 h-10 rounded object-cover"
                onError={() => setFaviconError(true)}
              />
            ) : (
              <div className={`w-10 h-10 flex items-center justify-center rounded ${isOwn ? 'bg-blue-100' : 'bg-gray-200'}`}>
                <Globe className={`w-5 h-5 ${isOwn ? 'text-blue-600' : 'text-gray-600'}`} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm mb-1 ${isOwn ? 'text-blue-900' : 'text-gray-900'}`}>
              {metadata.title}
            </p>
            {metadata.description && (
              <p className={`text-xs mb-2 line-clamp-2 ${isOwn ? 'text-blue-700' : 'text-gray-600'}`}>
                {metadata.description}
              </p>
            )}
            <div className="flex items-center gap-1.5">
              <ExternalLink className={`w-3 h-3 ${isOwn ? 'text-blue-600' : 'text-gray-500'}`} />
              <span className={`text-xs truncate ${isOwn ? 'text-blue-600' : 'text-gray-500'}`}>
                {metadata.siteName || extractDomain(metadata.url)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </a>
  )
}

