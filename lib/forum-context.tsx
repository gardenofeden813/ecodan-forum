"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { type Locale, t, type TranslationKey } from "./i18n"
import { type Thread, type Reply, type Category, type Tag, type Attachment, mockThreads, currentUser, parseMentions } from "./forum-data"

interface ForumContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  tr: (key: TranslationKey, params?: Record<string, string | number>) => string
  threads: Thread[]
  selectedThread: Thread | null
  setSelectedThread: (thread: Thread | null) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  activeFilter: "all" | "my" | "mentioned"
  setActiveFilter: (filter: "all" | "my" | "mentioned") => void
  activeCategoryFilter: Category | null
  setActiveCategoryFilter: (cat: Category | null) => void
  activeTagFilter: Tag | null
  setActiveTagFilter: (tag: Tag | null) => void
  addThread: (title: string, body: string, category: Category, tags: Tag[]) => void
  addReply: (threadId: string, body: string, attachments?: Attachment[]) => void
  toggleThreadStatus: (threadId: string) => void
  filteredThreads: Thread[]
}

const ForumContext = createContext<ForumContextType | undefined>(undefined)

export function ForumProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en")
  const [threads, setThreads] = useState<Thread[]>(mockThreads)
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<"all" | "my" | "mentioned">("all")
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<Category | null>(null)
  const [activeTagFilter, setActiveTagFilter] = useState<Tag | null>(null)

  const tr = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => t(locale, key, params),
    [locale]
  )

  const addThread = useCallback((title: string, body: string, category: Category, tags: Tag[]) => {
    const mentions = parseMentions(body)
    const newThread: Thread = {
      id: `t${Date.now()}`,
      title,
      body,
      author: currentUser,
      category,
      tags,
      status: "open",
      createdAt: new Date(),
      replies: [],
      mentions,
    }
    setThreads((prev) => [newThread, ...prev])
  }, [])

  const addReply = useCallback((threadId: string, body: string, attachments?: Attachment[]) => {
    const mentions = parseMentions(body)
    const newReply: Reply = {
      id: `r${Date.now()}`,
      threadId,
      author: currentUser,
      body,
      createdAt: new Date(),
      mentions,
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
    }
    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id === threadId) {
          const updated = { ...thread, replies: [...thread.replies, newReply] }
          setSelectedThread(updated)
          return updated
        }
        return thread
      })
    )
  }, [])

  const toggleThreadStatus = useCallback((threadId: string) => {
    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id === threadId) {
          const updated = { ...thread, status: thread.status === "open" ? "closed" : "open" } as Thread
          setSelectedThread(updated)
          return updated
        }
        return thread
      })
    )
  }, [])

  const filteredThreads = threads.filter((thread) => {
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchTitle = thread.title.toLowerCase().includes(q)
      const matchBody = thread.body.toLowerCase().includes(q)
      const matchAuthor = thread.author.displayName.toLowerCase().includes(q)
      if (!matchTitle && !matchBody && !matchAuthor) return false
    }

    // Active filter
    if (activeFilter === "my" && thread.author.id !== currentUser.id) return false
    if (activeFilter === "mentioned") {
      const isMentioned = thread.mentions.includes(currentUser.name) ||
        thread.replies.some((r) => r.mentions.includes(currentUser.name))
      if (!isMentioned) return false
    }

    // Category filter
    if (activeCategoryFilter && thread.category !== activeCategoryFilter) return false

    // Tag filter
    if (activeTagFilter && !thread.tags.includes(activeTagFilter)) return false

    return true
  })

  return (
    <ForumContext.Provider
      value={{
        locale,
        setLocale,
        tr,
        threads,
        selectedThread,
        setSelectedThread,
        searchQuery,
        setSearchQuery,
        activeFilter,
        setActiveFilter,
        activeCategoryFilter,
        setActiveCategoryFilter,
        activeTagFilter,
        setActiveTagFilter,
        addThread,
        addReply,
        toggleThreadStatus,
        filteredThreads,
      }}
    >
      {children}
    </ForumContext.Provider>
  )
}

export function useForum() {
  const context = useContext(ForumContext)
  if (!context) throw new Error("useForum must be used within ForumProvider")
  return context
}
