"use client"

import { useState, useTransition } from "react"
import { Languages, RotateCcw, Loader2 } from "lucide-react"
import { translateText } from "@/app/actions/translate"
import { useForum } from "@/lib/forum-context"

interface TranslateButtonProps {
  text: string
  onTranslated: (translatedText: string | null) => void
  isTranslated: boolean
  className?: string
}

export function TranslateButton({ text, onTranslated, isTranslated, className }: TranslateButtonProps) {
  const { tr, locale } = useForum()
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    if (isTranslated) {
      // Show original
      onTranslated(null)
      return
    }

    // Translate to the opposite language
    const targetLang = locale === "en" ? "ja" : "en"
    
    startTransition(async () => {
      const result = await translateText(text, targetLang)
      if (result.success) {
        onTranslated(result.translatedText)
      }
    })
  }

  return (
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
  )
}
