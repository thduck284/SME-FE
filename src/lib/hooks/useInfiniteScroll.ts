"use client"

import { useEffect, useRef } from "react"

export function useInfiniteScroll(
  callback: () => void, 
  isEnabled: boolean,
  threshold = 100,
  scrollContainer?: HTMLElement | null
) {
  const callbackRef = useRef(callback)
  const isEnabledRef = useRef(isEnabled)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    isEnabledRef.current = isEnabled
  }, [isEnabled])

  useEffect(() => {
    if (!isEnabled) return

    const container = scrollContainer || window
    const isWindow = container === window

    const handleScroll = () => {
      if (!isEnabledRef.current) return

      let scrollTop: number, scrollHeight: number, clientHeight: number

      if (isWindow) {
        scrollTop = document.documentElement.scrollTop || document.body.scrollTop
        scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight
        clientHeight = document.documentElement.clientHeight
      } else {
        const element = container as HTMLElement
        scrollTop = element.scrollTop
        scrollHeight = element.scrollHeight
        clientHeight = element.clientHeight
      }

      const distanceToBottom = scrollHeight - (scrollTop + clientHeight)
      const shouldTrigger = distanceToBottom <= threshold

      if (shouldTrigger) {
        callbackRef.current()
      }
    }

    let ticking = false
    const throttledScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll()
          ticking = false
        })
        ticking = true
      }
    }

    container.addEventListener('scroll', throttledScroll, { passive: true })

    return () => {
      container.removeEventListener('scroll', throttledScroll)
    }
  }, [isEnabled, threshold, scrollContainer])
}