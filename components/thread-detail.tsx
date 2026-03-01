"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { ArrowLeft, MessageSquare, Play, Pause, CheckCircle2, CircleDot, BookOpen, X, CornerDownLeft } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useForum } from "@/lib/forum-context"
import { getCategoryColor, getTagColor } from "@/lib/forum-data"
import type { Attachment } from "@/lib/forum-data"
import type { Message } from "@/lib/forum-context"
import { MentionText } from "@/components/mention-text"
import { ReplyComposer } from "@/components/reply-composer"
import { TranslateButton } from "@/components/translate-button"
import { ManualCitationCard } from "@/components/manual-citation-card"
import type { ManualCitation } from "@/lib/manuals"
import { cn } from "@/lib/utils"

// Parse citation JSON blocks from message content
function parseCitations(content: string): { text: string; citations: ManualCitation[] } {
  const citationRegex = /\n\n<!-- citations:([\s\S]*?) -->/
  const match = content.match(citationRegex)
  if (!match) return { text: content, citations: [] }
  try {
    const citations = JSON.parse(match[1]) as ManualCitation[]
    const text = content.replace(citationRegex, "").trim()
    return { text, citations }
  } catch {
    return { text: content, citations: [] }
  }
}

function getTimeAgoFromString(dateStr: string): string {
  const date = new Date(dateStr)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "Just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// Image lightbox modal
function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative max-h-[92vh] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -right-3 -top-3 z-10 flex size-7 items-center justify-center rounded-full bg-white text-black shadow-lg"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
        <img
          src={src}
          alt={alt}
          className="max-h-[88vh] max-w-[88vw] rounded-xl object-contain shadow-2xl"
        />
      </div>
    </div>
  )
}

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
    const handleEnded = () => { setIsPlaying(false); setCurrentTime(0) }
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
    if (isPlaying) { audio.pause(); setIsPlaying(false) }
    else { audio.play(); setIsPlaying(true) }
  }

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`

  return (
    <div className="overflow-hidden rounded-xl border border-primary/15 bg-primary/5">
      <div className="h-1 w-full bg-primary/10">
        <div className="h-full bg-primary transition-all duration-100" style={{ width: `${progressPercent}%` }} />
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
            {isPlaying ? tr("remainingTime", { n: Math.ceil(remainingTime) }) : formatTime(totalDuration)}
          </span>
        </div>
      </div>
      <audio ref={audioRef} src={attachment.url} className="hidden" preload="metadata" />
    </div>
  )
}

function AttachmentDisplay({ attachments }: { attachments: Attachment[] }) {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)
  const images = attachments.filter((a) => a.type === "image")
  const voices = attachments.filter((a) => a.type === "voice")
  return (
    <>
      {lightbox && (
        <ImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      )}
      <div className="mt-2 flex flex-col gap-2">
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((img) => (
              <button
                key={img.id}
                onClick={() => setLightbox({ src: img.url, alt: img.name })}
                className="group relative overflow-hidden rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label={`View ${img.name}`}
              >
                <img
                  src={img.url}
                  alt={img.name}
                  className="size-20 object-cover transition-transform group-hover:scale-105 sm:size-24"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/25">
                  <span className="text-[10px] font-semibold text-white opacity-0 drop-shadow group-hover:opacity-100">
                    Tap to expand
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
        {voices.map((v) => <VoicePlayer key={v.id} attachment={v} />)}
      </div>
    </>
  )
}

function TranslatableText({ text, className }: { text: string; className?: string }) {
  const [translatedText, setTranslatedText] = useState<string | null>(null)
  const displayText = translatedText || text
  return (
    <div className={className}>
      <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
        <MentionText text={displayText} />
      </div>
      <TranslateButton text={text} onTranslated={setTranslatedText}
        isTranslated={!!translatedText} className="mt-2 text-xs" />
    </div>
  )
}

// ─── Reddit-style nested reply card ─────────────────────────────────────────

interface ReplyCardProps {
  message: Message
  allMessages: Message[]
  depth: number
  replyingToId: string | null
  onReplyTo: (msg: Message) => void
  isClosed: boolean
}

function ReplyCard({ message, allMessages, depth, replyingToId, onReplyTo, isClosed }: ReplyCardProps) {
  const { tr } = useForum()
  const [translatedText, setTranslatedText] = useState<string | null>(null)
  const timeStr = getTimeAgoFromString(message.created_at)
  const displayName = message.profile?.full_name ?? "Unknown"
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
  const { text: cleanContent, citations } = parseCitations(message.content)
  const displayText = translatedText || cleanContent
  const isBeingRepliedTo = replyingToId === message.id

  // Find direct children of this message
  const children = allMessages.filter((m) => m.parent_id === message.id)

  // Max nesting depth to avoid excessive indentation on mobile
  const maxDepth = 4
  const indentClass = depth > 0 ? "ml-3 sm:ml-5" : ""

  return (
    <div className={cn("flex flex-col gap-0", indentClass)}>
      {/* Thread line for nested replies */}
      {depth > 0 && (
        <div className="flex gap-0">
          <div className="w-px bg-border shrink-0 ml-3.5 mr-3" />
        </div>
      )}
      <div className={cn(
        "flex gap-2.5 rounded-xl border bg-card p-3 sm:gap-3 sm:p-4 transition-colors",
        isBeingRepliedTo ? "border-primary/40 bg-primary/5" : "border-border"
      )}>
        <div className="relative shrink-0">
          <Avatar className="size-7 sm:size-8">
            <AvatarFallback className="bg-muted text-muted-foreground text-[10px] sm:text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex flex-1 flex-col gap-1 sm:gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground sm:text-sm">{displayName}</span>
            <span className="text-[10px] text-muted-foreground sm:text-[11px]">{timeStr}</span>
          </div>
          <div className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap sm:text-sm">
            <MentionText text={displayText} />
          </div>
          {message.attachments && message.attachments.length > 0 && (
            <AttachmentDisplay attachments={message.attachments} />
          )}
          {citations.length > 0 && (
            <div className="mt-2 space-y-2">
              {citations.map((citation, i) => (
                <ManualCitationCard key={i} citation={citation} />
              ))}
            </div>
          )}
          <div className="mt-1 flex items-center gap-3">
            <TranslateButton text={cleanContent} onTranslated={setTranslatedText}
              isTranslated={!!translatedText} className="text-[10px] sm:text-xs" />
            {!isClosed && (
              <button
                onClick={() => onReplyTo(message)}
                className={cn(
                  "flex items-center gap-1 text-[10px] sm:text-xs font-medium transition-colors",
                  isBeingRepliedTo
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <CornerDownLeft className="size-3" />
                {isBeingRepliedTo ? tr("replyingTo") : tr("reply")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Render children recursively */}
      {children.length > 0 && depth < maxDepth && (
        <div className="mt-2 flex flex-col gap-2">
          {children.map((child) => (
            <ReplyCard
              key={child.id}
              message={child}
              allMessages={allMessages}
              depth={depth + 1}
              replyingToId={replyingToId}
              onReplyTo={onReplyTo}
              isClosed={isClosed}
            />
          ))}
        </div>
      )}
      {/* If max depth reached but still has children, render them flat */}
      {children.length > 0 && depth >= maxDepth && (
        <div className="mt-2 flex flex-col gap-2">
          {children.map((child) => (
            <ReplyCard
              key={child.id}
              message={child}
              allMessages={allMessages}
              depth={depth}
              replyingToId={replyingToId}
              onReplyTo={onReplyTo}
              isClosed={isClosed}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function ThreadDetail() {
  const { tr, selectedThread, setSelectedThread, toggleThreadStatus } = useForum()
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLDivElement>(null)

  // Scroll the reply composer into view when the keyboard appears or replyingTo changes
  useEffect(() => {
    if (!composerRef.current) return
    // Small delay to allow layout to settle after keyboard opens
    const timer = setTimeout(() => {
      composerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }, 150)
    return () => clearTimeout(timer)
  }, [replyingTo])

  const handleReplyTo = useCallback((msg: Message) => {
    setReplyingTo((prev) => (prev?.id === msg.id ? null : msg))
  }, [])

  const handleReplySent = useCallback(() => {
    setReplyingTo(null)
  }, [])

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
  const timeStr = getTimeAgoFromString(thread.created_at)
  const authorDisplayName = thread.profile?.full_name ?? "Unknown"
  const authorInitials = authorDisplayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
  const isClosed = thread.status === "closed"

  // All messages except the first (body) message
  const allReplies = thread.messages.slice(1)
  // Top-level replies: those without a parent_id (or parent_id is null/undefined)
  const topLevelReplies = allReplies.filter((m) => !m.parent_id)
  const replyCount = allReplies.length

  return (
    // Use flex-col with overflow-hidden; the scroll area is a plain div with overflow-y-auto
    <div className="flex flex-1 flex-col bg-background overflow-hidden min-h-0">
      {/* Thread header */}
      <div className="flex items-start gap-3 border-b border-border px-4 py-3 sm:px-6 sm:py-4 shrink-0">
        <button
          onClick={() => setSelectedThread(null)}
          className="mt-0.5 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
          aria-label={tr("back")}
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex flex-1 flex-col gap-1.5 sm:gap-2">
          <div className="flex flex-wrap items-center gap-2">
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
          {thread.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {thread.tags.map((tag) => (
                <Badge key={tag} variant="secondary"
                  className={cn("h-4 rounded px-1.5 text-[9px] font-medium", getTagColor(tag))}>
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
              {tr("startedBy")} <span className="font-medium text-foreground">{authorDisplayName}</span>
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleThreadStatus(thread.id)}
          className="hidden sm:flex h-8 gap-1.5 rounded-xl text-xs"
        >
          {isClosed ? (
            <><CircleDot className="size-3.5" />{tr("reopenThread")}</>
          ) : (
            <><CheckCircle2 className="size-3.5" />{tr("markResolved")}</>
          )}
        </Button>
      </div>

      {/* Mobile status toggle */}
      <div className="flex border-b border-border px-4 py-2 sm:hidden shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleThreadStatus(thread.id)}
          className="h-8 w-full gap-1.5 rounded-xl text-xs"
        >
          {isClosed ? (
            <><CircleDot className="size-3.5" />{tr("reopenThread")}</>
          ) : (
            <><CheckCircle2 className="size-3.5" />{tr("markResolved")}</>
          )}
        </Button>
      </div>

      {/* Scrollable content — native overflow-y-auto for reliable mobile scrolling */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
        <div className="px-4 py-4 sm:px-6 sm:py-5">
          {/* AI Summary banner (when closed, no knowledge entry yet) */}
          {isClosed && !thread.knowledge_entry && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#0091ea]/20 bg-[#0091ea]/5 px-4 py-3">
              <BookOpen className="mt-0.5 size-4 shrink-0 text-[#0091ea]" />
              <div>
                <p className="text-xs font-semibold text-[#0091ea]">AI Summary</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  This thread has been marked as resolved. An AI summary will be saved to the knowledge base shortly.
                </p>
              </div>
            </div>
          )}

          {/* Original post body */}
          <TranslatableText text={thread.body} />

          <Separator className="my-5 sm:my-6" />

          {/* Knowledge Entry — shown between original post and replies when resolved */}
          {thread.knowledge_entry && (
            <>
              <div className="mb-5 rounded-xl border border-[#0091ea]/25 bg-[#0091ea]/5 px-4 py-4">
                <div className="mb-2 flex items-center gap-2">
                  <BookOpen className="size-4 shrink-0 text-[#0091ea]" />
                  <p className="text-xs font-semibold text-[#0091ea]">AI-Generated Summary</p>
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {thread.knowledge_entry.summary_content}
                </p>
                {thread.knowledge_entry.tags && thread.knowledge_entry.tags.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {thread.knowledge_entry.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-md bg-[#0091ea]/10 px-2 py-0.5 text-[10px] font-medium text-[#0091ea]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <Separator className="mb-5 sm:mb-6" />
            </>
          )}

          {/* Replies — Reddit-style nested */}
          <div className="flex flex-col gap-1">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {replyCount > 0 ? `${replyCount} ${tr("replies")}` : tr("noReplies")}
            </h3>
            <div className="mt-3 flex flex-col gap-3 sm:gap-4">
              {topLevelReplies.map((msg) => (
                <ReplyCard
                  key={msg.id}
                  message={msg}
                  allMessages={allReplies}
                  depth={0}
                  replyingToId={replyingTo?.id ?? null}
                  onReplyTo={handleReplyTo}
                  isClosed={isClosed}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reply composer — always at the bottom, never hidden */}
      <div ref={composerRef} className="shrink-0">
        <ReplyComposer
          threadId={thread.id}
          isClosed={isClosed}
          replyingTo={replyingTo}
          onReplySent={handleReplySent}
          onCancelReply={() => setReplyingTo(null)}
        />
      </div>
    </div>
  )
}
