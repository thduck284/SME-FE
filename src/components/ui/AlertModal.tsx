import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'

interface AlertModalProps {
  isOpen: boolean
  title: string
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  onClose: () => void
}

export function AlertModal({
  isOpen,
  title,
  message,
  type = 'info',
  onClose,
}: AlertModalProps) {
  if (!isOpen) return null

  const iconConfig = {
    success: { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-100' },
    error: { icon: AlertCircle, color: 'text-red-500', bgColor: 'bg-red-100' },
    warning: { icon: AlertTriangle, color: 'text-yellow-500', bgColor: 'bg-yellow-100' },
    info: { icon: Info, color: 'text-blue-500', bgColor: 'bg-blue-100' },
  }

  const buttonConfig = {
    success: 'bg-green-600 hover:bg-green-700 text-white',
    error: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    info: 'bg-blue-600 hover:bg-blue-700 text-white',
  }

  const config = iconConfig[type]
  const Icon = config.icon

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-in zoom-in-95 duration-200"
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
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-gray-700 leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${buttonConfig[type]}`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

