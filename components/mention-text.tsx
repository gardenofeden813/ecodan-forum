"use client"

import { Fragment } from "react"

interface MentionTextProps {
  text: string
}

export function MentionText({ text }: MentionTextProps) {
  // Split text by @username mentions
  const parts = text.split(/(@\w+)/g)

  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("@")) {
          return (
            <span
              key={i}
              className="inline-flex items-center rounded bg-mention/15 px-1 py-0.5 text-sm font-medium text-mention"
            >
              {part}
            </span>
          )
        }
        return <Fragment key={i}>{part}</Fragment>
      })}
    </span>
  )
}
