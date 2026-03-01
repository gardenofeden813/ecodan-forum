"use client"

import { useState, useEffect } from "react"
import {
  Search, MessageSquare, User, AtSign, Wrench, PlayCircle,
  AlertTriangle, FileQuestion, Box, Thermometer, Droplets,
  Snowflake, Cable, Tv2, Globe, LogOut, X, Bell,
} from "lucide-react"
import { NotificationSettingsDialog } from "@/components/notification-settings-dialog"
import { ManualManager } from "@/components/manual-manager"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { useForum } from "@/lib/forum-context"
import type { Category, Tag } from "@/lib/forum-data"
import type { Manual } from "@/lib/manuals"
import { cn } from "@/lib/utils"

const categoryIcons: Record<Category, typeof Wrench> = {
  installation: Wrench,
  commissioning: PlayCircle,
  troubleshooting: AlertTriangle,
  spec_consultation: FileQuestion,
}

const tagIcons: Record<Tag, typeof Box> = {
  outdoor_unit: Box,
  hydrobox: Droplets,
  remote: Tv2,
  wiring: Cable,
  heating: Thermometer,
  hot_water: Droplets,
  cooling: Snowflake,
}

interface ForumSidebarProps {
  onCloseMobile?: () => void
}

export function ForumSidebar({ onCloseMobile }: ForumSidebarProps) {
  const {
    locale,
    setLocale,
    tr,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    activeCategoryFilter,
    setActiveCategoryFilter,
    activeTagFilter,
    setActiveTagFilter,
    setSelectedThread,
    currentProfile,
    signOut,
  } = useForum()

  const [notifOpen, setNotifOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [manuals, setManuals] = useState<Manual[]>([])

  useEffect(() => {
    fetch("/api/admin/check")
      .then((r) => r.json())
      .then((d) => {
        if (d.isAdmin) {
          setIsAdmin(true)
          fetch("/api/manuals")
            .then((r) => r.json())
            .then((md) => setManuals(md.manuals ?? []))
            .catch(() => {})
        }
      })
      .catch(() => {})
  }, [])

  const navItems = [
    { key: "all" as const, label: tr("allThreads"), icon: MessageSquare },
    { key: "my" as const, label: tr("myThreads"), icon: User },
    { key: "mentioned" as const, label: tr("mentioned"), icon: AtSign },
  ]

  const categories: { key: Category; labelKey: "installation" | "commissioning" | "troubleshooting" | "spec_consultation" }[] = [
    { key: "installation", labelKey: "installation" },
    { key: "commissioning", labelKey: "commissioning" },
    { key: "troubleshooting", labelKey: "troubleshooting" },
    { key: "spec_consultation", labelKey: "spec_consultation" },
  ]

  const tags: { key: Tag; labelKey: Tag }[] = [
    { key: "outdoor_unit", labelKey: "outdoor_unit" },
    { key: "hydrobox", labelKey: "hydrobox" },
    { key: "remote", labelKey: "remote" },
    { key: "wiring", labelKey: "wiring" },
    { key: "heating", labelKey: "heating" },
    { key: "hot_water", labelKey: "hot_water" },
    { key: "cooling", labelKey: "cooling" },
  ]

  const displayName = currentProfile?.full_name ?? "User"
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const handleNavClick = (key: "all" | "my" | "mentioned") => {
    setActiveFilter(key)
    setActiveCategoryFilter(null)
    setActiveTagFilter(null)
    setSelectedThread(null)
    onCloseMobile?.()
  }

  const handleCategoryClick = (key: Category, isActive: boolean) => {
    setActiveCategoryFilter(isActive ? null : key)
    setActiveFilter("all")
    setActiveTagFilter(null)
    setSelectedThread(null)
    onCloseMobile?.()
  }

  const handleTagClick = (key: Tag, isActive: boolean) => {
    setActiveTagFilter(isActive ? null : key)
    setActiveFilter("all")
    setActiveCategoryFilter(null)
    setSelectedThread(null)
    onCloseMobile?.()
  }

  return (
    <>
    {/*
     * Use h-dvh (dynamic viewport height) so the sidebar fills the visible
     * screen area on iOS Safari (which shrinks when the address bar hides).
     * overflow-hidden on the outer div + overflow-y-auto on the scroll region
     * ensures the bottom user-profile section is always visible without needing
     * a separate ScrollArea component (which can have height issues on iOS).
     */}
    <div className="flex h-dvh w-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* ── App header ─────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between px-4 pt-4 pb-2 sm:pt-5 sm:pb-3">
        <div className="flex items-center gap-2">
          <img src="/ecodan-logo.svg" alt="ecodan" className="h-7 w-auto" />
          <span className="text-sm font-medium text-muted-foreground">Forum</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCloseMobile}
          className="size-8 p-0 text-muted-foreground md:hidden"
          aria-label={tr("close")}
        >
          <X className="size-5" />
        </Button>
      </div>

      {/* ── Search ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={tr("search")}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              if (e.target.value) {
                setSelectedThread(null)
                onCloseMobile?.()
              }
            }}
            className="h-10 rounded-xl border-0 bg-sidebar-accent pl-9 text-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-sidebar-ring"
          />
        </div>
      </div>

      <Separator className="shrink-0 bg-sidebar-border" />

      {/* ── Scrollable nav area ─────────────────────────────────────────────
           flex-1 + overflow-y-auto = this region scrolls, the header and
           footer stay fixed.
      ──────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-2">
        {/* Navigation */}
        <div className="py-2">
          <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {tr("threads")}
          </p>
          <nav className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive =
                activeFilter === item.key &&
                activeCategoryFilter === null &&
                activeTagFilter === null
              return (
                <button
                  key={item.key}
                  onClick={() => handleNavClick(item.key)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Categories */}
        <div className="py-2">
          <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {tr("categories")}
          </p>
          <nav className="flex flex-col gap-0.5">
            {categories.map((cat) => {
              const Icon = categoryIcons[cat.key]
              const isActive = activeCategoryFilter === cat.key
              return (
                <button
                  key={cat.key}
                  onClick={() => handleCategoryClick(cat.key, isActive)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {tr(cat.labelKey)}
                </button>
              )
            })}
          </nav>
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Equipment Tags */}
        <div className="py-2">
          <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {tr("tags")}
          </p>
          <nav className="flex flex-col gap-0.5">
            {tags.map((tag) => {
              const Icon = tagIcons[tag.key]
              const isActive = activeTagFilter === tag.key
              return (
                <button
                  key={tag.key}
                  onClick={() => handleTagClick(tag.key, isActive)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {tr(tag.labelKey)}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* ── Footer: language + user + logout — always visible ──────────────── */}
      <Separator className="shrink-0 bg-sidebar-border" />

      <div className="shrink-0 flex flex-col gap-2 p-3">
        {/* Admin: Manual Manager */}
        {isAdmin && (
          <ManualManager
            manuals={manuals}
            onUpload={(manual) => setManuals((prev) => [manual, ...prev])}
            onDelete={(id) => setManuals((prev) => prev.filter((m) => m.id !== id))}
          />
        )}

        {/* Language switcher */}
        <button
          onClick={() => setLocale(locale === "en" ? "ja" : "en")}
          className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <span className="flex items-center gap-2">
            <Globe className="size-4" />
            Language
          </span>
          <span className="text-foreground">{locale === "en" ? "EN" : "JA"}</span>
        </button>

        {/* User info + logout */}
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2.5 rounded-xl p-2">
            <div className="relative shrink-0">
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-sidebar bg-green-500" />
            </div>
            <div className="flex flex-1 flex-col items-start min-w-0">
              <span className="text-sm font-medium leading-none text-sidebar-foreground truncate max-w-full">
                {displayName}
              </span>
              <span className="text-xs text-muted-foreground truncate max-w-full">
                @{displayName.toLowerCase().replace(/\s+/g, "_")}
              </span>
            </div>
          </div>
          {/* Notification settings */}
          <button
            onClick={() => setNotifOpen(true)}
            title="Notification settings"
            className="flex shrink-0 items-center justify-center size-9 rounded-xl text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label="Notification settings"
          >
            <Bell className="size-4" />
          </button>
          {/* Sign out — always visible, no scroll needed */}
          <button
            onClick={() => signOut()}
            title="Sign out"
            className="flex shrink-0 items-center justify-center size-9 rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label={tr("signOut")}
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>

    <NotificationSettingsDialog open={notifOpen} onOpenChange={setNotifOpen} />
    </>
  )
}
