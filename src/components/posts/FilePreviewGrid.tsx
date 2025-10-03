import { FileText } from "lucide-react"

interface FilePreviewGridProps {
  files: File[]
  onRemoveFile: (index: number) => void
}

export function FilePreviewGrid({ files, onRemoveFile }: FilePreviewGridProps) {
  return (
    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
      {files.map((file, idx) => {
        const url = URL.createObjectURL(file)
        const isImage = file.type.startsWith("image")
        const isVideo = file.type.startsWith("video")

        return (
          <div
            key={idx}
            className="relative group rounded-2xl overflow-hidden border border-gray-300 bg-white shadow-sm"
          >
            {isImage ? (
              <img
                src={url}
                alt={file.name}
                className="w-full h-36 object-cover select-none rounded-2xl"
              />
            ) : isVideo ? (
              <video
                src={url}
                className="w-full h-36 object-cover rounded-2xl"
                controls
                preload="metadata"
                muted
              />
            ) : (
              <div className="w-full h-36 bg-gray-100 flex items-center justify-center rounded-2xl select-none">
                <FileText className="w-10 h-10 text-gray-400" />
              </div>
            )}
            <button
              onClick={() => onRemoveFile(idx)}
              className="absolute top-2 right-2 bg-black/60 text-white w-7 h-7 rounded-full text-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-orange-400"
              aria-label={`Remove file ${file.name}`}
              type="button"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}