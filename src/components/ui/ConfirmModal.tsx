import React from 'react'
import { X, AlertTriangle, Info, AlertCircle } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  type?: 'confirm' | 'warning' | 'danger' | 'info'
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  type = 'confirm',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null

  const iconConfig = {
    confirm: { icon: Info, color: 'text-blue-500', bgColor: 'bg-blue-100' },
    warning: { icon: AlertTriangle, color: 'text-yellow-500', bgColor: 'bg-yellow-100' },
    danger: { icon: AlertCircle, color: 'text-red-500', bgColor: 'bg-red-100' },
    info: { icon: Info, color: 'text-blue-500', bgColor: 'bg-blue-100' },
  }

  const buttonConfig = {
    confirm: {
      confirmClass: 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white border border-green-700',
      cancelClass: 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 border border-gray-300',
    },
    warning: {
      confirmClass: 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white border border-green-700',
      cancelClass: 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 border border-gray-300',
    },
    danger: {
      confirmClass: 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white border border-green-700',
      cancelClass: 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 border border-gray-300',
    },
    info: {
      confirmClass: 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white border border-green-700',
      cancelClass: 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 border border-gray-300',
    },
  }

  const config = iconConfig[type]
  const buttonStyles = buttonConfig[type]
  const Icon = config.icon

  const handleConfirm = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (onConfirm) {
      onConfirm()
    }
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onCancel) {
      onCancel()
    }
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCancel()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`${config.bgColor} p-2 rounded-full`}>
              <Icon className={`w-5 h-5 ${config.color}`} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={handleCancel}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            type="button"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-gray-700 leading-relaxed">{message}</p>
        </div>

        {/* Footer - Căn giữa 2 nút */}
        <div className="flex items-center justify-center gap-8 px-6 py-4 border-t border-gray-200 bg-white" style={{ display: 'flex' }}>
          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            type="button"
            className={`px-6 py-2.5 rounded-lg font-semibold transition-colors shadow-sm hover:shadow-md ${buttonStyles.confirmClass}`}
            style={{ display: 'inline-block', visibility: 'visible', opacity: 1, position: 'relative', zIndex: 1 }}
          >
            {confirmText}
          </button>
          {/* Cancel Button */}
          <button
            onClick={handleCancel}
            type="button"
            className={`px-6 py-2.5 rounded-lg font-semibold transition-colors ${buttonStyles.cancelClass}`}
            style={{ display: 'inline-block', visibility: 'visible', opacity: 1 }}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  )
}
