"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookOpen, ExternalLink, ChevronDown, ChevronUp } from "lucide-react"
import type { ManualCitation } from "@/lib/manuals"

interface ManualCitationCardProps {
  citation: ManualCitation
  /** If true, shows a remove button (used in composer) */
  onRemove?: () => void
}

export function ManualCitationCard({ citation, onRemove }: ManualCitationCardProps) {
  const [expanded, setExpanded] = useState(true)

  // Build a URL that opens the PDF at a specific page
  const pdfUrl = `${citation.file_url}#page=${citation.page_number}`

  return (
    <div className="border rounded-lg overflow-hidden bg-muted/20 text-sm w-full min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="font-medium truncate min-w-0">{citation.manual_title}</span>
          {citation.manual_type && (
            <Badge variant="secondary" className="text-xs shrink-0">
              {citation.manual_type}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground shrink-0">p.{citation.page_number}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            asChild
            title="Open PDF"
          >
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={onRemove}
              title="Remove citation"
            >
              ×
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="p-3 space-y-2 min-w-0 overflow-hidden">
          {/* Highlight image */}
          {citation.highlight_image && (
            <div className="border rounded overflow-hidden bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${citation.highlight_image}`}
                alt={`Page ${citation.page_number} highlight`}
                className="w-full h-auto max-h-48 object-contain"
              />
            </div>
          )}
          {/* Selected text — force wrap long words/strings */}
          {citation.selected_text && (
            <blockquote
              className="border-l-2 border-primary pl-3 italic text-muted-foreground text-xs leading-relaxed"
              style={{ overflowWrap: "break-word", wordBreak: "break-word", minWidth: 0 }}
            >
              &ldquo;{citation.selected_text}&rdquo;
            </blockquote>
          )}
          {/* Model name */}
          {citation.model_name && (
            <p className="text-xs text-muted-foreground truncate">{citation.model_name && `Model: ${citation.model_name}`}</p>
          )}
        </div>
      )}
    </div>
  )
}
