"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { ImagePlus, Mic, MicOff, X, Send, Play, Pause, Square, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MentionTextarea } from "@/components/mention-textarea"
import { useForum } from "@/lib/forum-context"
import { useVoiceRecorder } from "@/hooks/use-voice-recorder"
import type { Attachment } from "@/lib/forum-data"
import { cn } from "@/lib/utils"

interface ReplyComposerProps {
  threadId: string
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

export function ReplyComposer({ threadId }: ReplyComposerProps) {
  const { tr, addReply } = useForum()
  const [replyText, setReplyText] = useState("")
  const [images, setImages] = useState<{ id: string; url: string; name: string; file: File }[]>([])
  const [voiceAttachment, setVoiceAttachment] = useState<{ url: string; duration: number; blob?: Blob } | null>(null)
  const [isPlayingVoice, setIsPlayingVoice] = useState(false)
  const [currentPlayTime, setCurrentPlayTime] = useState(0)
  const [isPosting, setIsPosting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const {
    isRecording,
    duration,
    audioUrl,
    audioBlob,
    startRecording,
    stopRecording,
    clearRecording,
  } = useVoiceRecorder()

  // Update playback time
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const updateTime = () => setCurrentPlayTime(audio.currentTime)
    audio.addEventListener("timeupdate", updateTime)
    return () => audio.removeEventListener("timeupdate", updateTime)
  }, [voiceAttachment])

  const handleStopRecording = useCallback(() => {
    stopRecording()
  }, [stopRecording])

  // Accept recording into attachments
  const handleAcceptRecording = useCallback(() => {
    if (audioUrl) {
      setVoiceAttachment({ url: audioUrl, duration, blob: audioBlob ?? undefined })
      clearRecording()
    }
  }, [audioUrl, duration, audioBlob, clearRecording])

  const handleDiscardRecording = useCallback(() => {
    clearRecording()
    setVoiceAttachment(null)
    setCurrentPlayTime(0)
    setIsPlayingVoice(false)
  }, [clearRecording])

  // Image picker
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const newImages = Array.from(files).slice(0, 4 - images.length).map((file) => ({
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url: URL.createObjectURL(file),
      name: file.name,
      file,
    }))
    setImages((prev) => [...prev, ...newImages].slice(0, 4))
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removeImage = (id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id)
      if (img) URL.revokeObjectURL(img.url)
      return prev.filter((i) => i.id !== id)
    })
  }

  // Play/pause voice preview
  const toggleVoicePlayback = () => {
    if (!audioRef.current || !voiceAttachment) return
    if (isPlayingVoice) {
      audioRef.current.pause()
      setIsPlayingVoice(false)
    } else {
      audioRef.current.src = voiceAttachment.url
      audioRef.current.play()
      setIsPlayingVoice(true)
    }
  }

  // Post — upload files first, then save message
  const handlePost = async () => {
    const hasContent = replyText.trim() || images.length > 0 || voiceAttachment
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
          // Fall back to blob URL so the message still posts
          attachments.push({ id: img.id, type: "image", url: img.url, name: img.name })
        }
      }

      // Upload voice to Supabase Storage
      if (voiceAttachment) {
        try {
          const blob = voiceAttachment.blob ?? await fetch(voiceAttachment.url).then((r) => r.blob())
          const ext = blob.type.includes("ogg") ? "ogg" : "webm"
          const persistentUrl = await uploadToStorage(blob, `voice-${Date.now()}.${ext}`)
          attachments.push({
            id: `voice-${Date.now()}`,
            type: "voice",
            url: persistentUrl,
            name: `voice-message.${ext}`,
            duration: voiceAttachment.duration,
          })
        } catch (err) {
          console.error("Voice upload failed:", err)
          attachments.push({
            id: `voice-${Date.now()}`,
            type: "voice",
            url: voiceAttachment.url,
            name: "voice-message.webm",
            duration: voiceAttachment.duration,
          })
        }
      }

      await addReply(threadId, replyText.trim(), attachments.length > 0 ? attachments : undefined)

      // Reset state
      setReplyText("")
      images.forEach((img) => URL.revokeObjectURL(img.url))
      setImages([])
      setVoiceAttachment(null)
      setCurrentPlayTime(0)
      setIsPlayingVoice(false)
      clearRecording()
    } finally {
      setIsPosting(false)
    }
  }

  const hasContent = replyText.trim() || images.length > 0 || voiceAttachment
  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`

  const remainingTime = voiceAttachment ? Math.max(0, voiceAttachment.duration - currentPlayTime) : 0
  const progressPercent =
    voiceAttachment && voiceAttachment.duration > 0
      ? (currentPlayTime / voiceAttachment.duration) * 100
      : 0

  return (
    <div className="border-t border-border bg-card px-3 py-3 sm:px-6 sm:py-4">
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
          <audio
            ref={audioRef}
            onEnded={() => {
              setIsPlayingVoice(false)
              setCurrentPlayTime(0)
            }}
            className="hidden"
          />
        </div>
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

      {/* Recording just finished - accept/discard */}
      {audioUrl && !isRecording && !voiceAttachment && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-4 py-3">
          <Mic className="size-4 text-primary" />
          <span className="flex-1 text-sm text-foreground">
            {tr("voiceMessage")} ({formatDuration(duration)})
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDiscardRecording}
            className="h-7 rounded-lg text-xs text-muted-foreground"
          >
            <X className="mr-1 size-3" />
            {tr("removeAttachment")}
          </Button>
          <Button
            size="sm"
            onClick={handleAcceptRecording}
            className="h-7 rounded-lg text-xs bg-primary text-primary-foreground"
          >
            {tr("attachVoice")}
          </Button>
        </div>
      )}

      {/* Main input area */}
      <div className="flex flex-col gap-2">
        <MentionTextarea
          placeholder={tr("replyPlaceholder")}
          value={replyText}
          onChange={setReplyText}
          rows={2}
        />

        {/* Action bar */}
        <div className="flex items-center justify-between">
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
              className="h-9 gap-1.5 rounded-lg px-3 text-muted-foreground hover:text-foreground"
              aria-label={tr("attachImage")}
            >
              <ImagePlus className="size-4" />
              <span className="hidden text-xs sm:inline">{tr("attachImage")}</span>
            </Button>

            {/* Voice record */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={isRecording ? handleStopRecording : startRecording}
              disabled={isPosting}
              className={cn(
                "h-9 gap-1.5 rounded-lg px-3",
                isRecording
                  ? "text-destructive hover:text-destructive"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={isRecording ? tr("tapToStop") : tr("attachVoice")}
            >
              {isRecording ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              <span className="hidden text-xs sm:inline">
                {isRecording ? tr("tapToStop") : tr("attachVoice")}
              </span>
            </Button>
          </div>

          {/* Send */}
          <Button
            onClick={handlePost}
            disabled={!hasContent || isRecording || isPosting}
            size="sm"
            className="h-9 gap-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isPosting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            <span className="hidden sm:inline">
              {isPosting ? "Sending..." : tr("postReply")}
            </span>
          </Button>
        </div>
      </div>
    </div>
  )
}
