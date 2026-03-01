"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Search, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface ErrorCode {
  id: string
  unit_type: "indoor" | "outdoor"
  model_name: string | null
  error_code: string
  title: string | null
  possible_cause: string | null
  diagnosis_and_action: string | null
}

function ErrorCard({ ec }: { ec: ErrorCode }) {
  const [expanded, setExpanded] = useState(false)

  const causes = ec.possible_cause
    ? ec.possible_cause.split(" | ").filter(Boolean)
    : []

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      {/* Header */}
      <button
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex flex-col items-center gap-1 shrink-0">
          <span className="text-lg font-bold font-mono leading-none">{ec.error_code}</span>
          <Badge
            variant={ec.unit_type === "indoor" ? "default" : "secondary"}
            className="text-[10px] px-1.5 py-0"
          >
            {ec.unit_type === "indoor" ? "Indoor" : "Outdoor"}
          </Badge>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug line-clamp-2">
            {ec.title || "—"}
          </p>
          {ec.model_name && (
            <p className="text-xs text-muted-foreground mt-0.5">{ec.model_name}</p>
          )}
        </div>
        <div className="shrink-0 mt-0.5 text-muted-foreground">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t px-3 pb-3 pt-2 space-y-3">
          {causes.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Possible Cause
              </p>
              <ul className="space-y-1">
                {causes.map((c, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="text-muted-foreground shrink-0">•</span>
                    <span className="break-words">{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ec.diagnosis_and_action && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Diagnosis & Action
              </p>
              <p className="text-sm break-words whitespace-pre-wrap">
                {ec.diagnosis_and_action}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ErrorCodeLookup() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [unitFilter, setUnitFilter] = useState<"all" | "indoor" | "outdoor">("all")
  const [results, setResults] = useState<ErrorCode[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = useCallback(async (q: string, unit: typeof unitFilter) => {
    const trimmed = q.trim()
    if (!trimmed) {
      setResults([])
      setSearched(false)
      return
    }
    setLoading(true)
    setSearched(true)
    try {
      const supabase = createClient()
      let qb = supabase
        .from("error_codes")
        .select("*")
        .or(`error_code.ilike.%${trimmed}%,title.ilike.%${trimmed}%,possible_cause.ilike.%${trimmed}%`)
        .order("unit_type")
        .order("error_code")
        .limit(30)

      if (unit !== "all") {
        qb = qb.eq("unit_type", unit)
      }

      const { data, error } = await qb
      if (error) throw error
      setResults(data || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleQueryChange = (val: string) => {
    setQuery(val)
    handleSearch(val, unitFilter)
  }

  const handleUnitChange = (val: typeof unitFilter) => {
    setUnitFilter(val)
    handleSearch(query, val)
  }

  const handleOpen = (v: boolean) => {
    setOpen(v)
    if (!v) {
      setQuery("")
      setResults([])
      setSearched(false)
      setUnitFilter("all")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-2 justify-start">
          <AlertTriangle className="h-4 w-4" />
          Error Code Lookup
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg w-full flex flex-col max-h-[85dvh]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Error Code Lookup
          </DialogTitle>
        </DialogHeader>

        {/* Search controls */}
        <div className="shrink-0 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9"
              placeholder="Search by code (e.g. U1) or keyword..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              autoFocus
            />
          </div>
          {/* Unit type filter */}
          <div className="flex gap-1.5">
            {(["all", "indoor", "outdoor"] as const).map((v) => (
              <button
                key={v}
                onClick={() => handleUnitChange(v)}
                className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                  unitFilter === v
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {v === "all" ? "All Units" : v === "indoor" ? "Indoor" : "Outdoor"}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {loading && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Searching...
            </div>
          )}
          {!loading && searched && results.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No error codes found for &ldquo;{query}&rdquo;.
            </p>
          )}
          {!loading && !searched && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Enter an error code or keyword to search.
            </p>
          )}
          {!loading && results.map((ec) => (
            <ErrorCard key={ec.id} ec={ec} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
