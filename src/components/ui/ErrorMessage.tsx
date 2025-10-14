"use client"

import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui"

interface ErrorMessageProps {
  error: string | null
  onClose: () => void
}

export function ErrorMessage({ error, onClose }: ErrorMessageProps) {
  if (!error) return null

  return (
    <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{error}</span>
      <Button
        variant="ghost"
        size="sm"
        className="ml-auto h-6 w-6 p-0 text-red-700 hover:bg-red-100"
        onClick={onClose}
      >
        ×
      </Button>
    </div>
  )
}