"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
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
  parent_id?: string | null
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

// ─── Notification settings ──────────────────────────────────────────────────

export interface NotificationSettings {
  email_on_reply: boolean
  email_on_mention: boolean
  email_on_resolve: boolean
  notification_email: string | null
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
  addReply: (threadId: string, body: string, attachments?: Attachment[], parentId?: string | null) => Promise<void>
  toggleThreadStatus: (threadId: string) => Promise<void>
  filteredThreads: Thread[]
  isLoading: boolean
  signOut: () => Promise<void>
  allProfiles: Profile[]
  notificationSettings: NotificationSettings | null
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>
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
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null)

  // Use a ref to track the selected thread ID without causing loadThreads to re-create
  const selectedThreadIdRef = useRef<string | null>(null)
  // Ref to the setSelectedThread setter so loadThreads can call it without deps
  const setSelectedThreadRef = useRef<(t: Thread | null) => void>(setSelectedThread)
  useEffect(() => {
    setSelectedThreadRef.current = setSelectedThread
  })

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Load threads ───────────────────────────────────────────────────────────
  // Debounce ref to prevent rapid-fire reloads from Realtime events
  const loadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLoadingRef = useRef(false)
  // Track when the last load started so we can detect stuck locks
  const loadStartTimeRef = useRef<number>(0)

  // NOTE: No dependency on selectedThread state — use refs instead to avoid infinite loop
  const loadThreads = useCallback(async () => {
    // Prevent concurrent loads, but release the lock if it's been held for >15s (stuck)
    if (isLoadingRef.current) {
      const elapsed = Date.now() - loadStartTimeRef.current
      if (elapsed < 15000) return
      // Lock has been held too long — force-release and proceed
      console.warn("loadThreads: force-releasing stuck lock after", elapsed, "ms")
    }
    isLoadingRef.current = true
    loadStartTimeRef.current = Date.now()
    setIsLoading(true)
    try {
      // Fetch all data in parallel for speed
      const [threadResult, profileResult, messageResult, knowledgeResult] = await Promise.all([
        supabase.from("threads").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*"),
        supabase.from("messages").select("*").order("created_at", { ascending: true }),
        supabase.from("knowledge_entries").select("*"),
      ])

      const threadRows = threadResult.data
      if (!threadRows) {
        setThreads([])
        return
      }

      const profileMap = new Map<string, Profile>(
        (profileResult.data ?? []).map((p) => [p.id, p])
      )

      const messagesByThread = new Map<string, Message[]>()
      for (const msg of messageResult.data ?? []) {
        const mentions = parseMentions(msg.content)
        const attachments: Attachment[] = Array.isArray(msg.attachments) ? msg.attachments : []
        const enriched: Message = {
          ...msg,
          profile: profileMap.get(msg.sender_id) ?? null,
          mentions,
          attachments,
        }
        if (!messagesByThread.has(msg.thread_id)) messagesByThread.set(msg.thread_id, [])
        messagesByThread.get(msg.thread_id)!.push(enriched)
      }

      const knowledgeByThread = new Map<string, KnowledgeEntry>(
        (knowledgeResult.data ?? []).map((k) => [k.thread_id, k as KnowledgeEntry])
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

      // Update selectedThread using the ref (no state dependency = no infinite loop)
      const currentSelectedId = selectedThreadIdRef.current
      if (currentSelectedId) {
        const updated = enrichedThreads.find((t) => t.id === currentSelectedId)
        if (updated) setSelectedThreadRef.current(updated)
      }
    } finally {
      isLoadingRef.current = false
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // ← empty deps: stable reference, uses refs for selectedThread

  // Debounced version for Realtime triggers to avoid rapid-fire reloads
  const debouncedLoadThreads = useCallback(() => {
    if (loadDebounceRef.current) clearTimeout(loadDebounceRef.current)
    loadDebounceRef.current = setTimeout(() => {
      loadThreads()
    }, 500)
  }, [loadThreads])

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
      if (user) {
        await ensureProfile(user)
        await loadNotificationSettings(user.id)
      }
      await loadProfiles()
      await loadThreads()
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ── Wrapped setSelectedThread that also updates the ref ────────────────────
  const setSelectedThreadWithRef = useCallback((thread: Thread | null) => {
    selectedThreadIdRef.current = thread?.id ?? null
    setSelectedThread(thread)
  }, [])

  // ── addThread ──────────────────────────────────────────────────────────────
  const addThread = useCallback(
    async (title: string, body: string, category: Category, _tags: Tag[]) => {
      // Get the current user — use cached value first, fall back to fresh fetch
      let uid = currentUser?.id
      if (!uid) {
        // Add a timeout to prevent hanging on mobile
        const authPromise = supabase.auth.getUser()
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Auth timeout")), 8000)
        )
        const { data: { user } } = await Promise.race([authPromise, timeoutPromise]) as Awaited<typeof authPromise>
        uid = user?.id
      }
      if (!uid) {
        throw new Error("Not authenticated")
      }

      const { data: thread, error: threadError } = await supabase
        .from("threads")
        .insert({
          title,
          category,
          status: "open",
          created_by: uid,
        })
        .select()
        .single()

      if (threadError || !thread) {
        console.error("Thread insert error:", threadError)
        throw new Error(threadError?.message ?? "Failed to create thread")
      }

      // Insert first message as body
      if (body.trim()) {
        const { error: msgError } = await supabase.from("messages").insert({
          thread_id: thread.id,
          content: body,
          sender_id: uid,
          attachments: [],
        })
        if (msgError) {
          console.error("Message insert error:", msgError)
          // Don't throw here — thread was created, just the body message failed
        }
      }

      // Set the new thread ID in the ref so loadThreads will auto-select it
      selectedThreadIdRef.current = thread.id

      // Force-release the load lock so loadThreads can run even if a previous
      // load is "stuck" (can happen on mobile after a slow network request)
      isLoadingRef.current = false

      // Reload threads immediately (don't rely solely on Realtime on mobile)
      await loadThreads()
    },
    [currentUser, loadThreads]
  )

  // ── addReply ───────────────────────────────────────────────────────────────
  const addReply = useCallback(
    async (threadId: string, body: string, attachments?: Attachment[], parentId?: string | null) => {
      if (!currentUser) return

      const { error } = await supabase.from("messages").insert({
        thread_id: threadId,
        content: body,
        sender_id: currentUser.id,
        attachments: attachments && attachments.length > 0 ? attachments : [],
        ...(parentId ? { parent_id: parentId } : {}),
      })

      if (error) {
        console.error("Message insert error:", error)
        return
      }

      // Don't await — Realtime will trigger loadThreads automatically
      loadThreads()
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

      // Optimistically update selectedThread immediately so UI responds instantly
      // (loadThreads will also update it, but this prevents the flash of stale state)
      if (selectedThreadIdRef.current === threadId) {
        const optimistic: Thread = { ...thread, status: newStatus }
        // Use setSelectedThreadWithRef to keep selectedThreadIdRef in sync
        setSelectedThreadWithRef(optimistic)
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

  // ── Notification settings ────────────────────────────────────────────────
  const loadNotificationSettings = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("user_id", userId)
      .single()
    if (data) {
      setNotificationSettings({
        email_on_reply: data.email_on_reply ?? true,
        email_on_mention: data.email_on_mention ?? true,
        email_on_resolve: data.email_on_resolve ?? false,
        notification_email: data.notification_email ?? null,
      })
    } else {
      // Default settings
      setNotificationSettings({
        email_on_reply: true,
        email_on_mention: true,
        email_on_resolve: false,
        notification_email: null,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateNotificationSettings = useCallback(async (settings: Partial<NotificationSettings>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const merged = { ...notificationSettings, ...settings } as NotificationSettings
    setNotificationSettings(merged)
    await supabase
      .from("notification_settings")
      .upsert({
        user_id: user.id,
        email_on_reply: merged.email_on_reply,
        email_on_mention: merged.email_on_mention,
        email_on_resolve: merged.email_on_resolve,
        notification_email: merged.notification_email,
      }, { onConflict: "user_id" })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationSettings])

  // ── signOut ────────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    // Hard redirect to login page
    if (typeof window !== "undefined") {
      window.location.replace("/login")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Filter — full-text search across title, body, all reply messages, and author ──
  const filteredThreads = threads.filter((thread) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchTitle = thread.title.toLowerCase().includes(q)
      const matchBody = thread.body.toLowerCase().includes(q)
      const matchAuthor = (thread.profile?.full_name ?? "").toLowerCase().includes(q)
      // Search inside all reply messages (full conversation search)
      const matchReplies = thread.messages.some((m) =>
        m.content.toLowerCase().includes(q) ||
        (m.profile?.full_name ?? "").toLowerCase().includes(q)
      )
      if (!matchTitle && !matchBody && !matchAuthor && !matchReplies) return false
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
        setSelectedThread: setSelectedThreadWithRef,
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
        notificationSettings,
        updateNotificationSettings,
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
