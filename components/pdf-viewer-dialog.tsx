"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Quote,
  Loader2,
  BookOpen,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import type { Manual, ManualCitation } from "@/lib/manuals"
import { Badge } from "@/components/ui/badge"

// Dynamic import of pdfjs to avoid SSR issues
let pdfjsLib: typeof import("pdfjs-dist") | null = null

async function getPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import("pdfjs-dist")
    // Use local worker from public directory
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
  }
  return pdfjsLib
}

interface PdfViewerDialogProps {
  open: boolean
  onClose: () => void
  manuals: Manual[]
  onCite: (citation: ManualCitation) => void
}

interface SearchResult {
  pageIndex: number
  matchIndex: number
}

export function PdfViewerDialog({ open, onClose, manuals, onCite }: PdfViewerDialogProps) {
  const [selectedManualId, setSelectedManualId] = useState<string>("")
  const [pdfDoc, setPdfDoc] = useState<import("pdfjs-dist").PDFDocumentProxy | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.2)
  const [loading, setLoading] = useState(false)
  const [pageInput, setPageInput] = useState("1")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchIndex, setSearchIndex] = useState(0)
  const [searching, setSearching] = useState(false)
  const [selectedText, setSelectedText] = useState("")
  const [isCiting, setIsCiting] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textLayerRef = useRef<HTMLDivElement>(null)
  const pageContainerRef = useRef<HTMLDivElement>(null)
  const renderTaskRef = useRef<import("pdfjs-dist").RenderTask | null>(null)
  const loadingTaskRef = useRef<import("pdfjs-dist").PDFDocumentLoadingTask | null>(null)

  const selectedManual = manuals.find((m) => m.id === selectedManualId)

  // Load PDF when manual changes
  useEffect(() => {
    if (!selectedManualId || !open) return
    const manual = manuals.find((m) => m.id === selectedManualId)
    if (!manual) return

    let cancelled = false
    setLoading(true)
    setPdfDoc(null)
    setCurrentPage(1)
    setPageInput("1")
    setTotalPages(0)
    setSearchResults([])
    setSearchQuery("")
    setSelectedText("")

    ;(async () => {
      try {
        const pdfjs = await getPdfjs()
        // Cancel previous loading task
        if (loadingTaskRef.current) {
          await loadingTaskRef.current.destroy().catch(() => {})
        }
        const loadingTask = pdfjs.getDocument({ url: manual.file_url, withCredentials: false })
        loadingTaskRef.current = loadingTask
        const doc = await loadingTask.promise
        if (cancelled) { doc.destroy(); return }
        setTotalPages(doc.numPages)
        setPdfDoc(doc)
      } catch (e) {
        console.error("PDF load error:", e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedManualId, open])

  // Render page
  const renderPage = useCallback(async (doc: import("pdfjs-dist").PDFDocumentProxy, pageNum: number, sc: number) => {
    if (!canvasRef.current || !textLayerRef.current || !pageContainerRef.current) return
    const canvas = canvasRef.current
    const textLayer = textLayerRef.current
    const pageContainer = pageContainerRef.current

    // Cancel previous render
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel()
      renderTaskRef.current = null
    }

    try {
      const page = await doc.getPage(pageNum)
      const viewport = page.getViewport({ scale: sc })

      // Set canvas dimensions
      canvas.width = viewport.width
      canvas.height = viewport.height

      // Render PDF page to canvas
      const renderTask = page.render({ canvas, viewport })
      renderTaskRef.current = renderTask
      await renderTask.promise

      // Set --total-scale-factor on the page container
      // This is REQUIRED by pdfjs-dist v4+ TextLayer CSS for correct positioning
      pageContainer.style.setProperty("--total-scale-factor", String(sc))
      pageContainer.style.width = `${viewport.width}px`
      pageContainer.style.height = `${viewport.height}px`

      // Clear and resize text layer
      textLayer.innerHTML = ""
      textLayer.style.width = `${viewport.width}px`
      textLayer.style.height = `${viewport.height}px`

      const textContent = await page.getTextContent()
      const pdfjs = await getPdfjs()

      // Use TextLayer class from pdfjs-dist v5
      const textLayerInstance = new pdfjs.TextLayer({
        textContentSource: textContent,
        container: textLayer,
        viewport,
      })
      await textLayerInstance.render()
    } catch (e: unknown) {
      if (e instanceof Error && e.message !== "Rendering cancelled") {
        console.error("Render error:", e)
      }
    }
  }, [])

  useEffect(() => {
    if (!pdfDoc) return
    renderPage(pdfDoc, currentPage, scale)
  }, [pdfDoc, currentPage, scale, renderPage])

  // Search across all pages
  const handleSearch = useCallback(async () => {
    if (!pdfDoc || !searchQuery.trim()) return
    setSearching(true)
    setSearchResults([])
    const results: SearchResult[] = []
    const q = searchQuery.toLowerCase()
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i)
      const textContent = await page.getTextContent()
      const text = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .toLowerCase()
      let idx = 0
      let matchIdx = 0
      while ((idx = text.indexOf(q, idx)) !== -1) {
        results.push({ pageIndex: i, matchIndex: matchIdx++ })
        idx += q.length
      }
    }
    setSearchResults(results)
    setSearchIndex(0)
    if (results.length > 0) {
      setCurrentPage(results[0].pageIndex)
      setPageInput(String(results[0].pageIndex))
    }
    setSearching(false)
  }, [pdfDoc, searchQuery])

  const goToSearchResult = (idx: number) => {
    if (searchResults.length === 0) return
    const clamped = Math.max(0, Math.min(idx, searchResults.length - 1))
    setSearchIndex(clamped)
    setCurrentPage(searchResults[clamped].pageIndex)
    setPageInput(String(searchResults[clamped].pageIndex))
  }

  const handlePageInput = (v: string) => {
    setPageInput(v)
    const n = parseInt(v)
    if (!isNaN(n) && n >= 1 && n <= totalPages) {
      setCurrentPage(n)
    }
  }

  // Capture selected text from text layer
  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim())
    }
  }

  // Capture highlighted region as base64 image and create citation
  const handleCite = useCallback(async () => {
    if (!selectedManual) return
    setIsCiting(true)
    try {
      let highlightImage: string | null = null
      const selection = window.getSelection()

      if (selection && selection.rangeCount > 0 && canvasRef.current) {
        const range = selection.getRangeAt(0)
        const canvasRect = canvasRef.current.getBoundingClientRect()
        const selectionRect = range.getBoundingClientRect()

        // Calculate intersection with canvas
        const x = Math.max(0, selectionRect.left - canvasRect.left)
        const y = Math.max(0, selectionRect.top - canvasRect.top)
        const w = Math.min(selectionRect.width, canvasRect.width - x)
        const h = Math.min(selectionRect.height + 8, canvasRect.height - y)

        if (w > 0 && h > 0) {
          // Draw canvas region to a new canvas with highlight
          const offscreen = document.createElement("canvas")
          const padding = 8
          offscreen.width = Math.min(w + padding * 2, canvasRef.current.width)
          offscreen.height = Math.min(h + padding * 2, canvasRef.current.height)
          const ctx = offscreen.getContext("2d")!

          // Draw the page region
          ctx.drawImage(
            canvasRef.current,
            Math.max(0, x - padding),
            Math.max(0, y - padding),
            offscreen.width,
            offscreen.height,
            0, 0,
            offscreen.width,
            offscreen.height
          )

          // Draw yellow highlight overlay
          ctx.fillStyle = "rgba(255, 230, 0, 0.35)"
          ctx.fillRect(padding, padding, w, h - 8)

          highlightImage = offscreen.toDataURL("image/png").replace("data:image/png;base64,", "")
        }
      }

      const citation: ManualCitation = {
        manual_id: selectedManual.id,
        manual_title: selectedManual.title,
        model_name: selectedManual.model_name,
        manual_type: selectedManual.manual_type,
        page_number: currentPage,
        selected_text: selectedText,
        highlight_image: highlightImage,
        highlight_rect: null,
        file_url: selectedManual.file_url,
      }

      onCite(citation)
      onClose()
    } finally {
      setIsCiting(false)
    }
  }, [selectedManual, currentPage, selectedText, onCite, onClose])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Cite from Manual
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b bg-muted/20 shrink-0">
          {/* Manual selector */}
          <Select value={selectedManualId} onValueChange={setSelectedManualId}>
            <SelectTrigger className="w-64 h-8 text-sm">
              <SelectValue placeholder="Select a manual..." />
            </SelectTrigger>
            <SelectContent>
              {manuals.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span className="flex items-center gap-2">
                    <span className="truncate max-w-48">{m.title}</span>
                    {m.manual_type && (
                      <Badge variant="secondary" className="text-xs shrink-0">{m.manual_type}</Badge>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="flex items-center gap-1">
            <Input
              className="h-8 w-40 text-sm"
              placeholder="Search text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button size="sm" variant="outline" className="h-8 px-2" onClick={handleSearch} disabled={searching}>
              {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            </Button>
            {searchResults.length > 0 && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {searchIndex + 1}/{searchResults.length}
              </span>
            )}
            {searchResults.length > 1 && (
              <>
                <Button size="sm" variant="ghost" className="h-8 px-1" onClick={() => goToSearchResult(searchIndex - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 px-1" onClick={() => goToSearchResult(searchIndex + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>

          {/* Page navigation */}
          {totalPages > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              <Button
                size="sm" variant="ghost" className="h-8 px-1"
                onClick={() => { const p = currentPage - 1; if (p >= 1) { setCurrentPage(p); setPageInput(String(p)) } }}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Input
                className="h-8 w-12 text-sm text-center"
                value={pageInput}
                onChange={(e) => handlePageInput(e.target.value)}
              />
              <span className="text-xs text-muted-foreground">/ {totalPages}</span>
              <Button
                size="sm" variant="ghost" className="h-8 px-1"
                onClick={() => { const p = currentPage + 1; if (p <= totalPages) { setCurrentPage(p); setPageInput(String(p)) } }}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 px-1" onClick={() => setScale((s) => Math.min(s + 0.2, 3))}>
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 px-1" onClick={() => setScale((s) => Math.max(s - 0.2, 0.5))}>
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* PDF Canvas area */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4 min-h-0">
          {!selectedManualId && (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Select a manual to view</p>
            </div>
          )}
          {selectedManualId && loading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {selectedManualId && !loading && pdfDoc && (
            /* pageContainerRef holds --total-scale-factor for PDF.js TextLayer CSS */
            <div
              ref={pageContainerRef}
              className="relative inline-block mx-auto shadow-lg"
              style={{ position: "relative" }}
              onMouseUp={handleTextSelection}
            >
              <canvas ref={canvasRef} className="block" />
              <div
                ref={textLayerRef}
                className="textLayer"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  pointerEvents: "auto",
                }}
              />
            </div>
          )}
        </div>

        {/* Footer: selected text + cite button */}
        <div className="flex items-center gap-3 px-4 py-3 border-t bg-background shrink-0">
          <div className="flex-1 min-w-0">
            {selectedText ? (
              <p className="text-xs text-muted-foreground truncate italic">
                Selected: &ldquo;{selectedText}&rdquo;
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Drag to select text on the page, then click &quot;Cite This&quot;
              </p>
            )}
          </div>
          <Button
            onClick={handleCite}
            disabled={!selectedManualId || !pdfDoc || isCiting}
            className="gap-2 shrink-0"
          >
            {isCiting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Quote className="h-4 w-4" />
            )}
            Cite This (p.{currentPage})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
