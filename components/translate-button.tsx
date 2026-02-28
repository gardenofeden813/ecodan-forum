"use client"

import { useState } from "react"
import { Languages, RotateCcw, Loader2 } from "lucide-react"
import { useForum } from "@/lib/forum-context"

interface TranslateButtonProps {
  text: string
  onTranslated: (translatedText: string | null) => void
  isTranslated: boolean
  className?: string
}

/**
 * Detect whether the text is primarily Japanese.
 * Returns true if more than 10% of characters are Japanese (hiragana, katakana, CJK).
 */
function isJapanese(text: string): boolean {
  const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3400-\u4DBF]/g
  const matches = text.match(japanesePattern)
  if (!matches) return false
  // Consider it Japanese if at least 10% of non-whitespace chars are Japanese
  const nonWhitespace = text.replace(/\s/g, "").length
  return nonWhitespace > 0 && matches.length / nonWhitespace >= 0.1
}

export function TranslateButton({ text, onTranslated, isTranslated, className }: TranslateButtonProps) {
  const { tr } = useForum()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    if (isTranslated) {
      onTranslated(null)
      setError(null)
      return
    }

    // Auto-detect: if text is Japanese → translate to English, otherwise → translate to Japanese
    const targetLang = isJapanese(text) ? "en" : "ja"

    setIsPending(true)
    setError(null)
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLang }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error ?? "Translation failed.")
        return
      }

      onTranslated(data.translatedText)
    } catch (err) {
      console.error("Translation fetch error:", err)
      setError("Failed to connect to translation service.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex flex-col items-start">
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50 ${className}`}
      >
        {isPending ? (
          <>
            <Loader2 className="size-3 animate-spin" />
            <span>{tr("translating")}</span>
          </>
        ) : isTranslated ? (
          <>
            <RotateCcw className="size-3" />
            <span>{tr("showOriginal")}</span>
          </>
        ) : (
          <>
            <Languages className="size-3" />
            <span>{tr("translate")}</span>
          </>
        )}
      </button>
      {error && (
        <span className="mt-0.5 text-[10px] text-destructive">{error}</span>
      )}
    </div>
  )
}
