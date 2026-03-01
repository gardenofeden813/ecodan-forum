"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { ImagePlus, Mic, MicOff, X, Send, Play, Pause, Square, Loader2, CornerDownLeft, Quote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MentionTextarea } from "@/components/mention-textarea"
import { useForum } from "@/lib/forum-context"
import { useVoiceRecorder } from "@/hooks/use-voice-recorder"
import type { Attachment } from "@/lib/forum-data"
import type { Message } from "@/lib/forum-context"
import { cn } from "@/lib/utils"
import { PdfViewerDialog } from "@/components/pdf-viewer-dialog"
import { ManualCitationCard } from "@/components/manual-citation-card"
import type { ManualCitation, Manual } from "@/lib/manuals"

interface ReplyComposerProps {
  threadId: string
  isClosed?: boolean
  replyingTo?: Message | null
  onReplySent?: () => void
  onCancelReply?: () => void
}

// Upload a file to Supabase Storage via the /api/upload endpoint
async function uploadToStorage(file: File | Blob, filename: string): Promise<string> {
  const formData = new FormData()
  formData.append("file", file, filename)
  formData.append("bucket", "attachments")

  const res = await fetch("/api/upload", { method: "POST", body: formData })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? "Upload failed")
  }
  const data = await res.json()
  return data.url as string
}

export function ReplyComposer({
  threadId,
  isClosed = false,
  replyingTo = null,
  onReplySent,
  onCancelReply,
}: ReplyComposerProps) {
  const { tr, addReply } = useForum()
  const [replyText, setReplyText] = useState("")
  const [images, setImages] = useState<{ id: string; url: string; name: string; file: File }[]>([])
  const [voiceAttachment, setVoiceAttachment] = useState<{ url: string; duration: number; blob?: Blob } | null>(null)
  const [isPosting, setIsPosting] = useState(false)
  const [isPlayingVoice, setIsPlayingVoice] = useState(false)
  const [currentPlayTime, setCurrentPlayTime] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Citation state
  const [citations, setCitations] = useState<ManualCitation[]>([])
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [manuals, setManuals] = useState<Manual[]>([])
  const [manualsLoaded, setManualsLoaded] = useState(false)

  // Keep a ref to duration so we can read the latest value inside onstop callback
  const durationRef = useRef(0)

  const {
    isRecording,
    duration,
    audioUrl,
    audioBlob,
    startRecording,
    stopRecording,
    clearRecording,
  } = useVoiceRecorder()

  // Keep durationRef in sync
  useEffect(() => {
    durationRef.current = duration
  }, [duration])

  // When audioUrl/audioBlob become available after stopRecording, auto-set voiceAttachment
  useEffect(() => {
    if (audioUrl && audioBlob && !isRecording) {
      setVoiceAttachment((prev) => {
        // Don't overwrite if already set (e.g. user manually accepted)
        if (prev) return prev
        return { url: audioUrl, duration: durationRef.current, blob: audioBlob }
      })
    }
  }, [audioUrl, audioBlob, isRecording])

  // Sync audio element src whenever voiceAttachment url changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (voiceAttachment?.url) {
      audio.src = voiceAttachment.url
      audio.load()
    } else {
      audio.src = ""
    }
  }, [voiceAttachment?.url])

  // Sync audio playback time
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const update = () => setCurrentPlayTime(audio.currentTime)
    audio.addEventListener("timeupdate", update)
    return () => audio.removeEventListener("timeupdate", update)
  }, [])

  const handleStopRecording = useCallback(() => {
    stopRecording()
  }, [stopRecording])

  const handleDiscardRecording = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
    }
    setVoiceAttachment(null)
    clearRecording()
    setIsPlayingVoice(false)
    setCurrentPlayTime(0)
  }, [clearRecording])

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const newImages = files.slice(0, 4 - images.length).map((f) => ({
      id: `${Date.now()}-${Math.random()}`,
      url: URL.createObjectURL(f),
      name: f.name,
      file: f,
    }))
    setImages((prev) => [...prev, ...newImages])
    e.target.value = ""
  }, [images.length])

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id)
      if (img) URL.revokeObjectURL(img.url)
      return prev.filter((i) => i.id !== id)
    })
  }, [])

  // Play/pause voice preview
  const toggleVoicePlayback = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !voiceAttachment) return
    if (isPlayingVoice) {
      audio.pause()
      setIsPlayingVoice(false)
    } else {
      audio.play().then(() => {
        setIsPlayingVoice(true)
      }).catch((err) => {
        console.error("Audio play error:", err)
      })
    }
  }, [isPlayingVoice, voiceAttachment])

  // Load manuals lazily when PDF viewer is opened
  const handleOpenPdfViewer = useCallback(async () => {
    if (!manualsLoaded) {
      try {
        const resp = await fetch("/api/manuals")
        if (resp.ok) {
          const data = await resp.json()
          setManuals(data.manuals ?? [])
          setManualsLoaded(true)
        }
      } catch (e) {
        console.error("Failed to load manuals:", e)
      }
    }
    setPdfViewerOpen(true)
  }, [manualsLoaded])

  const handleAddCitation = useCallback((citation: ManualCitation) => {
    setCitations((prev) => [...prev, citation])
  }, [])

  // Post — upload files first, then save message
  const handlePost = async () => {
    const hasContent = replyText.trim() || images.length > 0 || voiceAttachment || citations.length > 0
    if (!hasContent || isPosting) return

    setIsPosting(true)
    try {
      const attachments: Attachment[] = []

      // Upload images to Supabase Storage
      for (const img of images) {
        try {
          const persistentUrl = await uploadToStorage(img.file, img.name)
          attachments.push({
            id: img.id,
            type: "image",
            url: persistentUrl,
            name: img.name,
          })
        } catch (err) {
          console.error("Image upload failed:", err)
          attachments.push({ id: img.id, type: "image", url: img.url, name: img.name })
        }
      }

      // Upload voice to Supabase Storage
      if (voiceAttachment) {
        try {
          const rawBlob: Blob = voiceAttachment.blob
            ?? await fetch(voiceAttachment.url).then((r) => r.blob())
          // Derive extension from actual blob MIME type
          const mime = rawBlob.type || "audio/webm"
          const ext = mime.includes("ogg") ? "ogg" : mime.includes("mp4") ? "mp4" : "webm"
          const filename = `voice-${Date.now()}.${ext}`
          const persistentUrl = await uploadToStorage(rawBlob, filename)
          attachments.push({
            id: `voice-${Date.now()}`,
            type: "voice",
            url: persistentUrl,
            name: `voice-message.${ext}`,
            duration: voiceAttachment.duration,
          })
        } catch (err) {
          console.error("Voice upload failed:", err)
          // Fall back to object URL (won't persist across sessions, but at least posts)
          attachments.push({
            id: `voice-${Date.now()}`,
            type: "voice",
            url: voiceAttachment.url,
            name: "voice-message.webm",
            duration: voiceAttachment.duration,
          })
        }
      }

      // Prepend mention if replying to someone
      let finalText = replyText.trim()
      if (replyingTo) {
        const name = replyingTo.profile?.full_name ?? "Unknown"
        const mention = `@${name.replace(/\s+/g, "_")}`
        if (!finalText.startsWith(mention)) {
          finalText = `${mention} ${finalText}`
        }
      }

      // Append citations as a special JSON block in the message content
      if (citations.length > 0) {
        const citationBlock = `\n\n<!-- citations:${JSON.stringify(citations)} -->`
        finalText += citationBlock
      }

      await addReply(threadId, finalText, attachments.length > 0 ? attachments : undefined, replyingTo?.id ?? null)

      // Reset state
      setReplyText("")
      images.forEach((img) => URL.revokeObjectURL(img.url))
      setImages([])
      setCitations([])
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ""
      }
      setVoiceAttachment(null)
      setCurrentPlayTime(0)
      setIsPlayingVoice(false)
      clearRecording()
      onReplySent?.()
    } finally {
      setIsPosting(false)
    }
  }

  const hasContent = replyText.trim() || images.length > 0 || voiceAttachment || citations.length > 0
  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`

  const remainingTime = voiceAttachment ? Math.max(0, voiceAttachment.duration - currentPlayTime) : 0
  const progressPercent =
    voiceAttachment && voiceAttachment.duration > 0
      ? (currentPlayTime / voiceAttachment.duration) * 100
      : 0

  // When thread is closed, show a banner but still allow posting after reopen
  if (isClosed) {
    return (
      <div className="border-t border-border bg-card px-4 py-3 sm:px-6">
        <p className="text-center text-xs text-muted-foreground">
          This thread is marked as resolved.{" "}
          <span className="text-foreground font-medium">Reopen it</span> to post a reply.
        </p>
      </div>
    )
  }

  return (
    <div className="border-t border-border bg-card px-3 py-3 sm:px-6 sm:py-4">
      {/* Replying-to indicator */}
      {replyingTo && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5">
          <CornerDownLeft className="size-3.5 shrink-0 text-primary" />
          <span className="flex-1 truncate text-xs text-foreground">
            Replying to{" "}
            <span className="font-semibold">{replyingTo.profile?.full_name ?? "Unknown"}</span>
          </span>
          <button
            onClick={onCancelReply}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Cancel reply"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Image previews */}
      {images.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {images.map((img) => (
            <div key={img.id} className="group relative">
              <img
                src={img.url}
                alt={img.name}
                className="size-16 rounded-xl border border-border object-cover sm:size-20"
              />
              <button
                onClick={() => removeImage(img.id)}
                className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background opacity-0 transition-opacity group-hover:opacity-100"
                aria-label={tr("removeAttachment")}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Citation cards */}
      {citations.length > 0 && (
        <div className="mb-3 space-y-2">
          {citations.map((citation, i) => (
            <ManualCitationCard
              key={i}
              citation={citation}
              onRemove={() => setCitations((prev) => prev.filter((_, idx) => idx !== i))}
            />
          ))}
        </div>
      )}

      {/* Voice attachment preview with playback */}
      {voiceAttachment && !isRecording && (
        <div className="mb-3 overflow-hidden rounded-xl border border-primary/20 bg-primary/5">
          <div className="h-1 w-full bg-primary/10">
            <div
              className="h-full bg-primary transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5">
            <button
              onClick={toggleVoicePlayback}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {isPlayingVoice ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
            </button>
            <div className="flex flex-1 flex-col">
              <span className="text-sm font-medium text-foreground">{tr("voiceMessage")}</span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="tabular-nums">
                  {isPlayingVoice
                    ? tr("remainingTime", { n: Math.ceil(remainingTime) })
                    : formatDuration(voiceAttachment.duration)}
                </span>
              </div>
            </div>
            <button
              onClick={handleDiscardRecording}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={tr("removeAttachment")}
            >
              <X className="size-4" />
            </button>
          </div>
          {/* Hidden audio element — src is set via useEffect */}
          <audio
            ref={audioRef}
            onEnded={() => {
              setIsPlayingVoice(false)
              setCurrentPlayTime(0)
            }}
            className="hidden"
            preload="auto"
          />
        </div>
      )}

      {/* Hidden audio element when voiceAttachment is null (keeps ref alive) */}
      {!voiceAttachment && (
        <audio ref={audioRef} className="hidden" />
      )}

      {/* Active recording indicator */}
      {isRecording && (
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
          <span className="relative flex size-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-destructive" />
          </span>
          <span className="text-sm font-medium text-foreground">{tr("recording")}</span>
          <span className="text-sm tabular-nums text-muted-foreground">{formatDuration(duration)}</span>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="destructive"
            onClick={handleStopRecording}
            className="h-8 gap-1.5 rounded-lg text-xs"
          >
            <Square className="size-3" />
            {tr("tapToStop")}
          </Button>
        </div>
      )}

      {/* Main input area */}
      <div className="flex flex-col gap-2">
        <MentionTextarea
          placeholder={replyingTo
            ? `Reply to ${replyingTo.profile?.full_name ?? "Unknown"}...`
            : tr("replyPlaceholder")}
          value={replyText}
          onChange={setReplyText}
          rows={2}
        />

        {/* Action bar — icon-only buttons on mobile so Post button is never cut off */}
        <div className="flex items-center gap-1">
          {/* Image attach */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
            aria-label={tr("attachImage")}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= 4 || isRecording || isPosting}
            className="h-9 w-9 rounded-lg p-0 text-muted-foreground hover:text-foreground"
            aria-label={tr("attachImage")}
          >
            <ImagePlus className="size-4" />
          </Button>

          {/* Voice record */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={isRecording ? handleStopRecording : startRecording}
            disabled={isPosting || !!voiceAttachment}
            className={cn(
              "h-9 w-9 rounded-lg p-0",
              isRecording
                ? "text-destructive hover:text-destructive"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-label={isRecording ? tr("tapToStop") : tr("attachVoice")}
          >
            {isRecording ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </Button>

          {/* Cite manual */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleOpenPdfViewer}
            disabled={isPosting || isRecording}
            className="h-9 w-9 rounded-lg p-0 text-muted-foreground hover:text-foreground"
            aria-label="Cite from manual"
          >
            <Quote className="size-4" />
          </Button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Post button — always visible */}
          <Button
            onClick={handlePost}
            disabled={!hasContent || isPosting || isRecording}
            size="sm"
            className="h-9 gap-1.5 rounded-lg px-4 text-sm"
          >
            {isPosting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            <span>{tr("postReply")}</span>
          </Button>
        </div>
      </div>

      {/* PDF Viewer Dialog */}
      <PdfViewerDialog
        open={pdfViewerOpen}
        onClose={() => setPdfViewerOpen(false)}
        manuals={manuals}
        onCite={handleAddCitation}
      />
    </div>
  )
}
