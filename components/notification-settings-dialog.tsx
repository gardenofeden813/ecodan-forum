"use client"

import { useState, useEffect } from "react"
import { Bell, Mail, MessageSquare, AtSign, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useForum } from "@/lib/forum-context"
import { cn } from "@/lib/utils"

interface NotificationSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked ? "bg-primary" : "bg-input",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block size-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  )
}

export function NotificationSettingsDialog({
  open,
  onOpenChange,
}: NotificationSettingsDialogProps) {
  const { notificationSettings, updateNotificationSettings, currentUser } = useForum()

  const [emailOnReply, setEmailOnReply] = useState(true)
  const [emailOnMention, setEmailOnMention] = useState(true)
  const [emailOnResolve, setEmailOnResolve] = useState(false)
  const [notificationEmail, setNotificationEmail] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Sync from context
  useEffect(() => {
    if (notificationSettings) {
      setEmailOnReply(notificationSettings.email_on_reply)
      setEmailOnMention(notificationSettings.email_on_mention)
      setEmailOnResolve(notificationSettings.email_on_resolve)
      setNotificationEmail(notificationSettings.notification_email ?? currentUser?.email ?? "")
    } else if (currentUser?.email) {
      setNotificationEmail(currentUser.email)
    }
  }, [notificationSettings, currentUser])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateNotificationSettings({
        email_on_reply: emailOnReply,
        email_on_mention: emailOnMention,
        email_on_resolve: emailOnResolve,
        notification_email: notificationEmail.trim() || null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-4 max-w-md rounded-2xl border-border bg-card p-0 sm:mx-auto">
        <DialogHeader className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
              <Bell className="size-4.5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Notification Settings</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Choose when to receive email notifications
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="px-5 py-4 flex flex-col gap-5">
          {/* Notification email */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground" />
              Notification email
            </Label>
            <Input
              type="email"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              placeholder="your@email.com"
              className="h-10 rounded-xl text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Notifications will be sent to this address. Leave blank to use your account email.
            </p>
          </div>

          <Separator />

          {/* Toggle options */}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email me when…
            </p>

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-2.5">
                <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Someone replies to my thread</p>
                  <p className="text-xs text-muted-foreground">Get notified when a new reply is posted on a thread you created</p>
                </div>
              </div>
              <Toggle checked={emailOnReply} onChange={setEmailOnReply} />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-2.5">
                <AtSign className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">I am mentioned</p>
                  <p className="text-xs text-muted-foreground">Get notified when someone mentions you with @username</p>
                </div>
              </div>
              <Toggle checked={emailOnMention} onChange={setEmailOnMention} />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">A thread I follow is resolved</p>
                  <p className="text-xs text-muted-foreground">Get notified when a thread is marked as resolved</p>
                </div>
              </div>
              <Toggle checked={emailOnResolve} onChange={setEmailOnResolve} />
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400">
            <strong>Note:</strong> Email delivery requires a Resend API key to be configured. Contact your administrator to enable email notifications.
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-end gap-2 px-5 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 rounded-xl text-sm"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-9 gap-1.5 rounded-xl bg-primary text-primary-foreground text-sm"
          >
            {isSaving ? (
              <><Loader2 className="size-3.5 animate-spin" /> Saving…</>
            ) : saved ? (
              <><CheckCircle2 className="size-3.5" /> Saved!</>
            ) : (
              "Save settings"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
