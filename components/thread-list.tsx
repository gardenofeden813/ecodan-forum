"use client"

import { useState } from "react"
import { Plus, MessageSquare, CheckCircle2, CircleDot } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useForum } from "@/lib/forum-context"
import { getTimeAgo, getCategoryColor, getTagColor } from "@/lib/forum-data"
import { cn } from "@/lib/utils"
import { NewThreadDialog } from "@/components/new-thread-dialog"

export function ThreadList() {
  const { tr, filteredThreads, selectedThread, setSelectedThread } = useForum()
  const [showNewThread, setShowNewThread] = useState(false)

  return (
    <div className="flex h-full w-full flex-col border-r border-border bg-card md:w-80 lg:w-96">
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

      {/* Thread list */}
      <ScrollArea className="flex-1">
        {filteredThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
              <MessageSquare className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">{tr("noThreads")}</p>
            <p className="text-xs text-muted-foreground">{tr("noThreadsDesc")}</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredThreads.map((thread) => {
              const time = getTimeAgo(thread.createdAt)
              const timeStr = time.n !== undefined ? tr(time.key, { n: time.n }) : tr(time.key)
              const initials = thread.author.displayName
                .split(" ")
                .map((n) => n[0])
                .join("")
              const isSelected = selectedThread?.id === thread.id
              const isClosed = thread.status === "closed"

              return (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThread(thread)}
                  className={cn(
                    "flex flex-col gap-1.5 border-b border-border px-3 py-3 text-left transition-colors sm:gap-2 sm:px-4",
                    isSelected
                      ? "bg-secondary"
                      : "hover:bg-muted/50"
                  )}
                >
                  {/* Status + Category + time */}
                  <div className="flex items-center gap-1.5">
                    {/* Status indicator - eco blue for resolved, dan red for open */}
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
                  <h3 className={cn(
                    "text-sm font-medium leading-snug line-clamp-2",
                    isClosed ? "text-muted-foreground" : "text-foreground"
                  )}>
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
                      <span className="text-xs text-muted-foreground">
                        {thread.author.displayName}
                      </span>
                    </div>
                    {thread.replies.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="size-3" />
                        <span>{thread.replies.length}</span>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </ScrollArea>

      {/* New thread dialog */}
      <NewThreadDialog open={showNewThread} onOpenChange={setShowNewThread} />
    </div>
  )
}
