import { X } from "lucide-react"

interface ToastModalProps {
  isOpen: boolean
  message: string
  type: "success" | "error"
  onClose: () => void
}

export function ToastModal({ isOpen, message, type, onClose }: ToastModalProps) {
  if (!isOpen) return null

  const bgColor = type === "success" ? "bg-green-100" : "bg-red-100"
  const textColor = type === "success" ? "text-green-800" : "text-red-800"

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]"
      role="alertdialog"
      aria-modal="true"
      aria-live="assertive"
      onClick={onClose}
    >
      <div
        className={`${bgColor} p-6 rounded-xl shadow-lg max-w-sm w-full flex items-center gap-4`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`font-semibold ${textColor} flex-grow select-none`}>{message}</div>
        <button
          onClick={onClose}
          className={`text-xl font-bold ${textColor} hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-${type === "success" ? "green" : "red"}-500 rounded`}
          aria-label="Close notification"
        >
          <X />
        </button>
      </div>
    </div>
  )
}