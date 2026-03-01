"use client"

import { useState } from "react"
import { ForumProvider, useForum } from "@/lib/forum-context"
import { ForumSidebar } from "@/components/forum-sidebar"
import { ThreadList } from "@/components/thread-list"
import { ThreadDetail } from "@/components/thread-detail"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function ForumLayout() {
  const { selectedThread, tr } = useForum()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background md:flex-row">
      {/* Mobile header - always shown on small screens */}
      <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2.5 md:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(true)}
          className="size-8 p-0 text-muted-foreground"
          aria-label="Menu"
        >
          <Menu className="size-5" />
        </Button>
        <span className="text-sm font-semibold text-foreground tracking-tight">{tr("appName")}</span>
      </div>

      {/* Sidebar overlay for mobile — only rendered when open to avoid fixed+translate causing iOS horizontal scroll */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 h-dvh md:hidden">
            <ForumSidebar onCloseMobile={() => setSidebarOpen(false)} />
          </aside>
        </>
      )}

      {/* Sidebar - always visible on md+ (not fixed, part of normal flow) */}
      <aside className="hidden md:flex md:h-full md:w-64 lg:w-72 shrink-0">
        <ForumSidebar onCloseMobile={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Thread list - visible when no thread selected on mobile, always on md+ */}
        <div
          className={cn(
            "w-full md:flex-none md:w-80 lg:w-96 min-h-0",
            selectedThread ? "hidden md:flex" : "flex"
          )}
        >
          <ThreadList />
        </div>

        {/* Thread detail - full screen on mobile when thread selected, flex-1 on md+ */}
        <div
          className={cn(
            "flex-1 min-h-0",
            selectedThread ? "flex" : "hidden md:flex"
          )}
        >
          <ThreadDetail />
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <ForumProvider>
      <ForumLayout />
    </ForumProvider>
  )
}
