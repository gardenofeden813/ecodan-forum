"use client"

import { useState } from "react"
import { Plus, MessageSquare, CheckCircle2, CircleDot, Loader2, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useForum } from "@/lib/forum-context"
import { getCategoryColor, getTagColor } from "@/lib/forum-data"
import { cn } from "@/lib/utils"
import { NewThreadDialog } from "@/components/new-thread-dialog"
import type { Thread } from "@/lib/forum-context"

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

export function ThreadList() {
  const { tr, filteredThreads, selectedThread, setSelectedThread, isLoading, searchQuery, setSearchQuery } = useForum()
  const [showNewThread, setShowNewThread] = useState(false)

  return (
    <div className="flex h-full w-full flex-col border-r border-border bg-card md:w-80 lg:w-96 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5 sm:px-4 sm:py-3">
        <h2 className="text-sm font-semibold text-foreground">{tr("threads")}</h2>
        <Button
          size="sm"
          onClick={() => setShowNewThread(true)}
          className="h-8 gap-1.5 rounded-xl bg-primary text-primary-foreground text-xs hover:bg-primary/90"
        >
          <Plus className="size-3.5" />
          <span className="hidden xs:inline sm:inline">{tr("newThread")}</span>
        </Button>
      </div>

      {/* Search bar — always visible in thread list for easy access */}
      <div className="border-b border-border px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search threads & messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 rounded-xl border-border bg-muted pl-9 pr-8 text-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
              <MessageSquare className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">{tr("noThreads")}</p>
            <p className="text-xs text-muted-foreground">{tr("noThreadsDesc")}</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredThreads.map((thread: Thread) => {
              const timeStr = getTimeAgoFromString(thread.created_at)
              const displayName = thread.profile?.full_name ?? "Unknown"
              const initials = displayName
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)
              const isSelected = selectedThread?.id === thread.id
              const isClosed = thread.status === "closed"
              // replies = messages excluding the first (body) message
              const replyCount = Math.max(0, thread.messages.length - 1)

              return (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThread(thread)}
                  className={cn(
                    "flex flex-col gap-1.5 border-b border-border px-3 py-3 text-left transition-colors sm:gap-2 sm:px-4",
                    isSelected ? "bg-secondary" : "hover:bg-muted/50"
                  )}
                >
                  {/* Status + Category + time */}
                  <div className="flex items-center gap-1.5">
                    {isClosed ? (
                      <CheckCircle2 className="size-4 shrink-0 text-[#0091ea]" />
                    ) : (
                      <CircleDot className="size-4 shrink-0 text-[#e53935]" />
                    )}
                    <Badge
                      variant="secondary"
                      className={cn("h-5 rounded-lg text-[10px] font-medium", getCategoryColor(thread.category))}
                    >
                      {tr(thread.category)}
                    </Badge>
                    <span className="ml-auto text-[11px] text-muted-foreground">{timeStr}</span>
                  </div>

                  {/* Title */}
                  <h3
                    className={cn(
                      "text-sm font-medium leading-snug line-clamp-2",
                      isClosed ? "text-muted-foreground" : "text-foreground"
                    )}
                  >
                    {thread.title}
                  </h3>

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

                  {/* Author + replies */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Avatar className="size-5">
                        <AvatarFallback className="bg-muted text-muted-foreground text-[9px] font-medium">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">{displayName}</span>
                    </div>
                    {replyCount > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="size-3" />
                        <span>{replyCount}</span>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* New thread dialog */}
      <NewThreadDialog open={showNewThread} onOpenChange={setShowNewThread} />
    </div>
  )
}
