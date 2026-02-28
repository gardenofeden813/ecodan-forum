"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForum } from "@/lib/forum-context"
import { MentionTextarea } from "@/components/mention-textarea"
import { getTagColor } from "@/lib/forum-data"
import type { Category, Tag } from "@/lib/forum-data"
import { cn } from "@/lib/utils"

interface NewThreadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const allTags: Tag[] = ["outdoor_unit", "hydrobox", "remote", "wiring", "heating", "hot_water", "cooling"]

export function NewThreadDialog({ open, onOpenChange }: NewThreadDialogProps) {
  const { tr, addThread } = useForum()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [category, setCategory] = useState<Category>("installation")
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])

  const toggleTag = (tag: Tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      await addThread(title.trim(), body.trim(), category, selectedTags)
      setTitle("")
      setBody("")
      setCategory("installation")
      setSelectedTags([])
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card text-card-foreground max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">{tr("newThread")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="thread-title" className="text-sm font-medium text-foreground">
              {tr("threadTitle")}
            </Label>
            <Input
              id="thread-title"
              placeholder={tr("threadTitlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="thread-category" className="text-sm font-medium text-foreground">
              {tr("category")}
            </Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger id="thread-category" className="bg-background rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="installation">{tr("installation")}</SelectItem>
                <SelectItem value="commissioning">{tr("commissioning")}</SelectItem>
                <SelectItem value="troubleshooting">{tr("troubleshooting")}</SelectItem>
                <SelectItem value="spec_consultation">{tr("spec_consultation")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-foreground">
              {tr("selectTags")}
            </Label>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => {
                const isSelected = selectedTags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                      isSelected
                        ? getTagColor(tag)
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {isSelected && <Check className="size-3" />}
                    {tr(tag)}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="thread-body" className="text-sm font-medium text-foreground">
              {tr("threadBody")}
            </Label>
            <MentionTextarea
              id="thread-body"
              placeholder={tr("threadBodyPlaceholder")}
              value={body}
              onChange={setBody}
              rows={4}
            />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto rounded-xl">
              {tr("cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!title.trim() || !body.trim() || isSubmitting}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto rounded-xl"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  {tr("create")}
                </span>
              ) : tr("create")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
