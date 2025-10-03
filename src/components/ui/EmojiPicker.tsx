import { useState } from "react"

const emojiGroups = {
  Smileys: [
    "😀","😃","😄","😁","😆","😍","😘","😜","🤪","🤩",
    "😎","😭","😡","😢","😂","🥰","😇","🤔","😴","😱"
  ],
  Gestures: [
    "👍","🙏","👏","🤝","✌️","🤘","🤟","👋","👌","🤏",
    "🤙","👊","✊","🤞","🤲","🤛","🤜","🤚","✋","🖐️"
  ],
  Symbols: [
    "❤️","💛","💚","💙","💜","💔","✨","💤","🔥","💯",
    "✔️","❌","⚡","☀️","⭐","🌙","☔","⚽","🎵","🎉"
  ],
  Animals: [
    "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯",
    "🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🐤","🦉"
  ],
  Food: [
    "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🍈",
    "🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦"
  ],
  Activities: [
    "⚽","🏀","🏈","⚾","🎾","🏐","🏉","🥏","🎱","🏓",
    "🏸","🥅","⛳","🏹","🎣","🥊","🥋","🎽","⛸️","🎿"
  ],
  Travel: [
    "🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐",
    "🚚","🚛","🚜","🛴","🚲","🛵","🏍️","✈️","🛩️","🚀"
  ]
}

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [activeGroup, setActiveGroup] = useState<keyof typeof emojiGroups>("Smileys")

  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-2 max-w-xs">
      {/* Tab buttons */}
      <div className="flex flex-wrap justify-around mb-2 gap-1">
        {Object.keys(emojiGroups).map(group => (
          <button
            key={group}
            type="button"
            className={`px-2 py-1 rounded-md text-sm font-medium ${
              activeGroup === group ? "bg-orange-200 text-orange-700" : "text-gray-600 hover:bg-gray-100"
            }`}
            onClick={() => setActiveGroup(group as keyof typeof emojiGroups)}
          >
            {group}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto">
        {emojiGroups[activeGroup].map(emoji => (
          <button
            key={emoji}
            type="button"
            className="text-2xl hover:bg-orange-100 rounded-md p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400"
            onClick={() => onSelect(emoji)}
            aria-label={`Insert emoji ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
