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

export function TranslateButton({ text, onTranslated, isTranslated, className }: TranslateButtonProps) {
  const { tr, locale } = useForum()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    if (isTranslated) {
      onTranslated(null)
      setError(null)
      return
    }

    // Always translate to the opposite of the current UI locale
    const targetLang = locale === "en" ? "ja" : "en"

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
