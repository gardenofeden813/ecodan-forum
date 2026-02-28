"use client"

import { useState, useRef, useEffect } from "react"
import { ArrowLeft, MessageSquare, Play, Pause, CheckCircle2, CircleDot } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useForum } from "@/lib/forum-context"
import { getTimeAgo, getCategoryColor, getTagColor } from "@/lib/forum-data"
import type { Attachment } from "@/lib/forum-data"
import { MentionText } from "@/components/mention-text"
import { ReplyComposer } from "@/components/reply-composer"
import { TranslateButton } from "@/components/translate-button"
import { cn } from "@/lib/utils"

function VoicePlayer({ attachment }: { attachment: Attachment }) {
  const { tr } = useForum()
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const totalDuration = attachment.duration || 0
  const remainingTime = Math.max(0, totalDuration - currentTime)
  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener("timeupdate", updateTime)
    audio.addEventListener("ended", handleEnded)
    return () => {
      audio.removeEventListener("timeupdate", updateTime)
      audio.removeEventListener("ended", handleEnded)
    }
  }, [])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play()
      setIsPlaying(true)
    }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`

  return (
    <div className="overflow-hidden rounded-xl border border-primary/15 bg-primary/5">
      <div className="h-1 w-full bg-primary/10">
        <div 
          className="h-full bg-primary transition-all duration-100"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div className="flex items-center gap-2.5 px-3 py-2">
        <button
          onClick={toggle}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
          aria-label={isPlaying ? tr("pause") : tr("play")}
        >
          {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5 ml-0.5" />}
        </button>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-foreground">{tr("voiceMessage")}</span>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {isPlaying 
              ? tr("remainingTime", { n: Math.ceil(remainingTime) })
              : formatTime(totalDuration)
            }
          </span>
        </div>
      </div>
      <audio ref={audioRef} src={attachment.url} className="hidden" preload="metadata" />
    </div>
  )
}

function AttachmentDisplay({ attachments }: { attachments: Attachment[] }) {
  const images = attachments.filter((a) => a.type === "image")
  const voices = attachments.filter((a) => a.type === "voice")

  return (
    <div className="mt-2 flex flex-col gap-2">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img) => (
            <img
              key={img.id}
              src={img.url}
              alt={img.name}
              className="max-h-48 rounded-xl border border-border object-cover sm:max-h-60"
            />
          ))}
        </div>
      )}
      {voices.map((v) => (
        <VoicePlayer key={v.id} attachment={v} />
      ))}
    </div>
  )
}

// Translatable text component
function TranslatableText({ 
  text, 
  className 
}: { 
  text: string
  className?: string 
}) {
  const [translatedText, setTranslatedText] = useState<string | null>(null)
  const displayText = translatedText || text

  return (
    <div className={className}>
      <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
        <MentionText text={displayText} />
      </div>
      <TranslateButton
        text={text}
        onTranslated={setTranslatedText}
        isTranslated={!!translatedText}
        className="mt-2 text-xs"
      />
    </div>
  )
}

// Reply with translation support
function ReplyCard({ reply }: { reply: { id: string; author: { displayName: string; isOnline: boolean }; body: string; createdAt: Date; attachments?: Attachment[] } }) {
  const { tr } = useForum()
  const [translatedText, setTranslatedText] = useState<string | null>(null)
  
  const rTime = getTimeAgo(reply.createdAt)
  const rTimeStr = rTime.n !== undefined ? tr(rTime.key, { n: rTime.n }) : tr(rTime.key)
  const rInitials = reply.author.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
  const displayText = translatedText || reply.body

  return (
    <div className="flex gap-2.5 rounded-xl border border-border bg-card p-3 sm:gap-3 sm:p-4">
      <div className="relative shrink-0">
        <Avatar className="size-7 sm:size-8">
          <AvatarFallback className="bg-muted text-muted-foreground text-[10px] sm:text-xs font-medium">
            {rInitials}
          </AvatarFallback>
        </Avatar>
        {reply.author.isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border-2 border-card bg-online sm:size-2.5" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 sm:gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground sm:text-sm">
            {reply.author.displayName}
          </span>
          <span className="text-[10px] text-muted-foreground sm:text-[11px]">{rTimeStr}</span>
        </div>
        <div className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap sm:text-sm">
          <MentionText text={displayText} />
        </div>
        {reply.attachments && reply.attachments.length > 0 && (
          <AttachmentDisplay attachments={reply.attachments} />
        )}
        <TranslateButton
          text={reply.body}
          onTranslated={setTranslatedText}
          isTranslated={!!translatedText}
          className="mt-1 text-[10px] sm:text-xs"
        />
      </div>
    </div>
  )
}

export function ThreadDetail() {
  const { tr, selectedThread, setSelectedThread, toggleThreadStatus } = useForum()

  if (!selectedThread) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-background">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
          <MessageSquare className="size-7 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{tr("noThreads")}</p>
      </div>
    )
  }

  const thread = selectedThread
  const time = getTimeAgo(thread.createdAt)
  const timeStr = time.n !== undefined ? tr(time.key, { n: time.n }) : tr(time.key)
  const authorInitials = thread.author.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
  const isClosed = thread.status === "closed"

  return (
    <div className="flex flex-1 flex-col bg-background">
      {/* Thread header */}
      <div className="flex items-start gap-3 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <button
          onClick={() => setSelectedThread(null)}
          className="mt-0.5 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          aria-label={tr("back")}
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex flex-1 flex-col gap-1.5 sm:gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Status badge - eco blue for resolved, dan red for open */}
            {isClosed ? (
              <Badge className="h-5 gap-1 rounded-lg bg-[#0091ea]/10 text-[#0091ea] text-[10px] font-medium">
                <CheckCircle2 className="size-3" />
                {tr("statusClosed")}
              </Badge>
            ) : (
              <Badge className="h-5 gap-1 rounded-lg bg-[#e53935]/10 text-[#e53935] text-[10px] font-medium">
                <CircleDot className="size-3" />
                {tr("statusOpen")}
              </Badge>
            )}
            <Badge
              variant="secondary"
              className={cn("h-5 rounded-lg text-[10px] font-medium", getCategoryColor(thread.category))}
            >
              {tr(thread.category)}
            </Badge>
            <span className="text-[11px] text-muted-foreground">{timeStr}</span>
          </div>
          <h1 className="text-base font-semibold leading-snug text-foreground sm:text-lg text-balance">
            {thread.title}
          </h1>
          {/* Equipment Tags */}
          {thread.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {thread.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className={cn("h-4 rounded px-1.5 text-[9px] font-medium", getTagColor(tag))}
                >
                  {tr(tag)}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Avatar className="size-5">
              <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-medium">
                {authorInitials}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              {tr("startedBy")} <span className="font-medium text-foreground">{thread.author.displayName}</span>
            </span>
          </div>
        </div>
        {/* Status toggle button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleThreadStatus(thread.id)}
          className="hidden sm:flex h-8 gap-1.5 rounded-xl text-xs"
        >
          {isClosed ? (
            <>
              <CircleDot className="size-3.5" />
              {tr("reopenThread")}
            </>
          ) : (
            <>
              <CheckCircle2 className="size-3.5" />
              {tr("markResolved")}
            </>
          )}
        </Button>
      </div>

      {/* Mobile status toggle */}
      <div className="flex border-b border-border px-4 py-2 sm:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleThreadStatus(thread.id)}
          className="h-8 w-full gap-1.5 rounded-xl text-xs"
        >
          {isClosed ? (
            <>
              <CircleDot className="size-3.5" />
              {tr("reopenThread")}
            </>
          ) : (
            <>
              <CheckCircle2 className="size-3.5" />
              {tr("markResolved")}
            </>
          )}
        </Button>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-4 sm:px-6 sm:py-5">
          {/* Original post body with translate */}
          <TranslatableText text={thread.body} />

          <Separator className="my-5 sm:my-6" />

          {/* Replies */}
          <div className="flex flex-col gap-1">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {thread.replies.length > 0
                ? `${thread.replies.length} ${tr("replies")}`
                : tr("noReplies")}
            </h3>

            <div className="mt-3 flex flex-col gap-3 sm:gap-4">
              {thread.replies.map((reply) => (
                <ReplyCard key={reply.id} reply={reply} />
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Reply composer */}
      <ReplyComposer threadId={thread.id} />
    </div>
  )
}
