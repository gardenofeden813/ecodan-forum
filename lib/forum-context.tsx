"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"
import { type Locale, t, type TranslationKey } from "./i18n"
import {
  type Category,
  type Tag,
  type Attachment,
  getCategoryColor,
  getTagColor,
  parseMentions,
} from "./forum-data"
import { createClient } from "./supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"

// ─── Domain types (Supabase-backed) ─────────────────────────────────────────

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
}

export interface Message {
  id: string
  thread_id: string
  content: string
  sender_id: string
  created_at: string
  profile?: Profile | null
  mentions: string[]
  attachments?: Attachment[]
}

export interface KnowledgeEntry {
  id: string
  thread_id: string
  title: string
  summary_content: string
  tags: string[]
  created_at: string
}

export interface Thread {
  id: string
  title: string
  category: Category
  status: "open" | "closed"
  created_at: string
  created_by: string
  profile?: Profile | null
  messages: Message[]
  mentions: string[]
  tags: Tag[]
  body: string // first message content
  knowledge_entry?: KnowledgeEntry | null
}

// ─── Context type ────────────────────────────────────────────────────────────

interface ForumContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  tr: (key: TranslationKey, params?: Record<string, string | number>) => string
  currentUser: SupabaseUser | null
  currentProfile: Profile | null
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
  addThread: (title: string, body: string, category: Category, tags: Tag[]) => Promise<void>
  addReply: (threadId: string, body: string, attachments?: Attachment[]) => Promise<void>
  toggleThreadStatus: (threadId: string) => Promise<void>
  filteredThreads: Thread[]
  isLoading: boolean
  signOut: () => Promise<void>
  allProfiles: Profile[]
}

const ForumContext = createContext<ForumContextType | undefined>(undefined)

// ─── Helper: parse tags from thread title/category ──────────────────────────

function extractTagsFromCategory(category: string): Tag[] {
  const tagMap: Record<string, Tag[]> = {
    installation: ["hydrobox", "wiring"],
    commissioning: ["outdoor_unit", "remote"],
    troubleshooting: ["outdoor_unit"],
    spec_consultation: ["cooling", "heating"],
  }
  return tagMap[category] ?? []
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ForumProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()

  const [locale, setLocale] = useState<Locale>("en")
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null)
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<"all" | "my" | "mentioned">("all")
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<Category | null>(null)
  const [activeTagFilter, setActiveTagFilter] = useState<Tag | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])

  const tr = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => t(locale, key, params),
    [locale]
  )

  // ── Auth listener ──────────────────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setCurrentUser(session?.user ?? null)
        if (session?.user) {
          await ensureProfile(session.user)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  // ── Ensure profile exists ──────────────────────────────────────────────────
  const ensureProfile = async (user: SupabaseUser) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (!profile) {
      const displayName = user.email?.split("@")[0] ?? "User"
      await supabase.from("profiles").insert({
        id: user.id,
        full_name: displayName,
        avatar_url: null,
      })
      setCurrentProfile({ id: user.id, full_name: displayName, avatar_url: null })
    } else {
      setCurrentProfile(profile)
    }
  }

  // ── Load all profiles ──────────────────────────────────────────────────────
  const loadProfiles = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("*")
    if (data) setAllProfiles(data)
  }, [])

  // ── Load threads ───────────────────────────────────────────────────────────
  const loadThreads = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: threadRows } = await supabase
        .from("threads")
        .select("*")
        .order("created_at", { ascending: false })

      if (!threadRows) {
        setThreads([])
        return
      }

      // Load all profiles for display
      const { data: profileRows } = await supabase.from("profiles").select("*")
      const profileMap = new Map<string, Profile>(
        (profileRows ?? []).map((p) => [p.id, p])
      )

      // Load all messages
      const { data: messageRows } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true })

      const messagesByThread = new Map<string, Message[]>()
      for (const msg of messageRows ?? []) {
        const mentions = parseMentions(msg.content)
        const enriched: Message = {
          ...msg,
          profile: profileMap.get(msg.sender_id) ?? null,
          mentions,
        }
        if (!messagesByThread.has(msg.thread_id)) {
          messagesByThread.set(msg.thread_id, [])
        }
        messagesByThread.get(msg.thread_id)!.push(enriched)
      }

      // Load knowledge entries
      const { data: knowledgeRows } = await supabase
        .from("knowledge_entries")
        .select("*")
      const knowledgeByThread = new Map<string, KnowledgeEntry>(
        (knowledgeRows ?? []).map((k) => [k.thread_id, k as KnowledgeEntry])
      )

      const enrichedThreads: Thread[] = threadRows.map((row) => {
        const msgs = messagesByThread.get(row.id) ?? []
        const firstMsg = msgs[0]
        const body = firstMsg?.content ?? ""
        const mentions = parseMentions(body)
        const tags = extractTagsFromCategory(row.category)

        return {
          id: row.id,
          title: row.title,
          category: row.category as Category,
          status: row.status as "open" | "closed",
          created_at: row.created_at,
          created_by: row.created_by,
          profile: profileMap.get(row.created_by) ?? null,
          messages: msgs,
          mentions,
          tags,
          body,
          knowledge_entry: knowledgeByThread.get(row.id) ?? null,
        }
      })

      setThreads(enrichedThreads)

      // Update selectedThread if it's open
      if (selectedThread) {
        const updated = enrichedThreads.find((t) => t.id === selectedThread.id)
        if (updated) setSelectedThread(updated)
      }
    } finally {
      setIsLoading(false)
    }
  }, [selectedThread?.id])

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
      if (user) await ensureProfile(user)
      await loadProfiles()
      await loadThreads()
    }
    init()
  }, [])

  // ── Realtime subscriptions ─────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("forum-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "threads" }, () => {
        loadThreads()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        loadThreads()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadThreads])

  // ── addThread ──────────────────────────────────────────────────────────────
  const addThread = useCallback(
    async (title: string, body: string, category: Category, _tags: Tag[]) => {
      if (!currentUser) return

      const { data: thread, error: threadError } = await supabase
        .from("threads")
        .insert({
          title,
          category,
          status: "open",
          created_by: currentUser.id,
        })
        .select()
        .single()

      if (threadError || !thread) {
        console.error("Thread insert error:", threadError)
        return
      }

      // Insert first message as body
      if (body.trim()) {
        await supabase.from("messages").insert({
          thread_id: thread.id,
          content: body,
          sender_id: currentUser.id,
        })
      }

      await loadThreads()
    },
    [currentUser, loadThreads]
  )

  // ── addReply ───────────────────────────────────────────────────────────────
  const addReply = useCallback(
    async (threadId: string, body: string, _attachments?: Attachment[]) => {
      if (!currentUser) return

      const { error } = await supabase.from("messages").insert({
        thread_id: threadId,
        content: body,
        sender_id: currentUser.id,
      })

      if (error) {
        console.error("Message insert error:", error)
        return
      }

      await loadThreads()
    },
    [currentUser, loadThreads]
  )

  // ── toggleThreadStatus ─────────────────────────────────────────────────────
  const toggleThreadStatus = useCallback(
    async (threadId: string) => {
      const thread = threads.find((t) => t.id === threadId)
      if (!thread) return

      const newStatus = thread.status === "open" ? "closed" : "open"

      const { error } = await supabase
        .from("threads")
        .update({ status: newStatus })
        .eq("id", threadId)

      if (error) {
        console.error("Status update error:", error)
        return
      }

      // If closing → trigger AI summary
      if (newStatus === "closed") {
        const replyMessages = thread.messages.slice(1).map((m) => ({
          author: m.profile?.full_name ?? "Unknown",
          content: m.content,
        }))

        fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            threadId,
            threadTitle: thread.title,
            threadContent: thread.body,
            messages: replyMessages,
            tags: thread.tags,
          }),
        }).catch(console.error)
      }

      await loadThreads()
    },
    [threads, loadThreads]
  )

  // ── signOut ────────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }, [])

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filteredThreads = threads.filter((thread) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchTitle = thread.title.toLowerCase().includes(q)
      const matchBody = thread.body.toLowerCase().includes(q)
      const matchAuthor = (thread.profile?.full_name ?? "").toLowerCase().includes(q)
      if (!matchTitle && !matchBody && !matchAuthor) return false
    }

    if (activeFilter === "my" && thread.created_by !== currentUser?.id) return false
    if (activeFilter === "mentioned") {
      const username = currentProfile?.full_name ?? ""
      const isMentioned =
        thread.mentions.includes(username) ||
        thread.messages.some((m) => m.mentions.includes(username))
      if (!isMentioned) return false
    }

    if (activeCategoryFilter && thread.category !== activeCategoryFilter) return false
    if (activeTagFilter && !thread.tags.includes(activeTagFilter)) return false

    return true
  })

  return (
    <ForumContext.Provider
      value={{
        locale,
        setLocale,
        tr,
        currentUser,
        currentProfile,
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
        isLoading,
        signOut,
        allProfiles,
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

// Re-export helpers so existing components still compile
export { getCategoryColor, getTagColor }
