"use client"

import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from "react"
import { Textarea } from "@/components/ui/textarea"
import { useForum } from "@/lib/forum-context"
import { cn } from "@/lib/utils"

interface MentionTextareaProps {
  id?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  rows?: number
}

export function MentionTextarea({ id, placeholder, value, onChange, rows = 3 }: MentionTextareaProps) {
  const { allProfiles } = useForum()
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [cursorPosition, setCursorPosition] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Build mention-friendly usernames from profiles
  const profileUsers = allProfiles.map((p) => ({
    id: p.id,
    name: (p.full_name ?? "user").toLowerCase().replace(/\s+/g, "_"),
    displayName: p.full_name ?? "Unknown",
  }))

  const filteredUsers = profileUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
      u.displayName.toLowerCase().includes(mentionQuery.toLowerCase())
  )

  const checkForMention = useCallback(
    (text: string, cursor: number) => {
      const textBeforeCursor = text.slice(0, cursor)
      const lastAtIndex = textBeforeCursor.lastIndexOf("@")

      if (lastAtIndex === -1) {
        setShowSuggestions(false)
        return
      }

      const charBefore = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : " "
      if (charBefore !== " " && charBefore !== "\n" && lastAtIndex !== 0) {
        setShowSuggestions(false)
        return
      }

      const query = textBeforeCursor.slice(lastAtIndex + 1)
      if (query.includes(" ")) {
        setShowSuggestions(false)
        return
      }

      setMentionQuery(query)
      setShowSuggestions(true)
      setSelectedIndex(0)
    },
    []
  )

  const insertMention = useCallback(
    (username: string) => {
      const textBeforeCursor = value.slice(0, cursorPosition)
      const lastAtIndex = textBeforeCursor.lastIndexOf("@")
      const beforeMention = value.slice(0, lastAtIndex)
      const afterCursor = value.slice(cursorPosition)
      const newValue = `${beforeMention}@${username} ${afterCursor}`
      onChange(newValue)
      setShowSuggestions(false)

      const newCursorPos = lastAtIndex + username.length + 2
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = newCursorPos
          textareaRef.current.selectionEnd = newCursorPos
          textareaRef.current.focus()
        }
      }, 0)
    },
    [value, cursorPosition, onChange]
  )

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const cursor = e.target.selectionStart || 0
    onChange(newValue)
    setCursorPosition(cursor)
    checkForMention(newValue, cursor)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || filteredUsers.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filteredUsers.length)
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length)
        break
      case "Enter":
      case "Tab":
        e.preventDefault()
        insertMention(filteredUsers[selectedIndex].name)
        break
      case "Escape":
        setShowSuggestions(false)
        break
    }
  }

  const handleClick = () => {
    if (textareaRef.current) {
      const cursor = textareaRef.current.selectionStart || 0
      setCursorPosition(cursor)
      checkForMention(value, cursor)
    }
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest("[data-mention-container]")) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div className="relative" data-mention-container>
      <Textarea
        ref={textareaRef}
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        rows={rows}
        className="resize-none bg-background text-sm"
      />

      {/* Mention suggestions dropdown */}
      {showSuggestions && filteredUsers.length > 0 && (
        <div className="absolute bottom-full left-0 z-50 mb-1 w-64 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          <div className="p-1">
            {filteredUsers.slice(0, 5).map((user, index) => (
              <button
                key={user.id}
                onClick={() => insertMention(user.name)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                  index === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "text-popover-foreground hover:bg-muted"
                )}
              >
                <div className="flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                  {user.displayName
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-none">{user.displayName}</span>
                  <span className="text-xs text-muted-foreground">@{user.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
