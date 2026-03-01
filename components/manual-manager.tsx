"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Trash2, Upload, FileText, Loader2, Settings } from "lucide-react"
import type { Manual } from "@/lib/manuals"
import { MANUAL_TYPES } from "@/lib/manuals"
import { createClient } from "@/lib/supabase/client"

interface ManualManagerProps {
  manuals: Manual[]
  onUpload: (manual: Manual) => void
  onDelete: (id: string) => void
}

export function ManualManager({ manuals, onUpload, onDelete }: ManualManagerProps) {
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "registering" | "done">("idle")
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [modelName, setModelName] = useState("")
  const [manualType, setManualType] = useState<string>("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    if (!isPdf) {
      setError("PDFファイルのみアップロードできます")
      return
    }
    setSelectedFile(file)
    setError(null)
    if (!title) {
      setTitle(file.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " "))
    }
  }

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !title.trim()) {
      setError("タイトルとPDFファイルを入力してください")
      return
    }
    setUploading(true)
    setUploadStatus("uploading")
    setError(null)

    try {
      const supabase = createClient()

      // Verify admin status
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("ログインが必要です")

      const { data: adminRow } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .single()
      if (!adminRow) throw new Error("管理者権限が必要です")

      // Build storage path
      const timestamp = Date.now()
      const random = Math.random().toString(36).slice(2, 8)
      const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")
      const storagePath = `${user.id}/${timestamp}-${random}-${safeName}`

      // Upload using Supabase JS SDK (automatically uses session token)
      const { error: uploadError } = await supabase.storage
        .from("manuals")
        .upload(storagePath, selectedFile, {
          contentType: "application/pdf",
          upsert: false,
        })

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("manuals")
        .getPublicUrl(storagePath)

      setUploadStatus("registering")

      // Register manual record via API
      const registerResp = await fetch("/api/manuals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          model_name: modelName.trim() || null,
          manual_type: manualType || null,
          storage_path: storagePath,
          file_url: urlData.publicUrl,
          file_size_bytes: selectedFile.size,
        }),
      })
      const registerData = await registerResp.json()
      if (!registerResp.ok) throw new Error(registerData.error || "登録に失敗しました")

      setUploadStatus("done")
      onUpload(registerData.manual)

      // Reset form after short delay
      setTimeout(() => {
        setTitle("")
        setModelName("")
        setManualType("")
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
        setUploadStatus("idle")
      }, 1500)

    } catch (e) {
      setError(e instanceof Error ? e.message : "アップロードに失敗しました")
      setUploadStatus("idle")
    } finally {
      setUploading(false)
    }
  }, [selectedFile, title, modelName, manualType, onUpload])

  const handleDelete = async (id: string) => {
    try {
      const resp = await fetch(`/api/manuals/${id}`, { method: "DELETE" })
      if (!resp.ok) {
        const data = await resp.json()
        throw new Error(data.error || "Delete failed")
      }
      onDelete(id)
    } catch (e) {
      alert(e instanceof Error ? e.message : "削除に失敗しました")
    }
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return ""
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const statusLabel = () => {
    switch (uploadStatus) {
      case "uploading": return "Uploading to storage..."
      case "registering": return "Registering manual..."
      case "done": return "Upload complete!"
      default: return ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Manage Manuals
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Manual Management
          </DialogTitle>
        </DialogHeader>

        {/* Upload form */}
        <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <h3 className="font-semibold text-sm">Upload New Manual</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="manual-title">Title *</Label>
              <Input
                id="manual-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. ERSF-NM6E-U1 Service Manual"
                disabled={uploading}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="model-name">Model Name</Label>
              <Input
                id="model-name"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="e.g. ERSF-NM6E-U1"
                disabled={uploading}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="manual-type">Manual Type</Label>
              <Select value={manualType} onValueChange={setManualType} disabled={uploading}>
                <SelectTrigger id="manual-type">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="pdf-file">PDF File *</Label>
              {/* Label wrapping input for iOS Safari compatibility */}
              <label
                htmlFor="pdf-file"
                className={`flex items-center gap-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background ${uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-accent hover:text-accent-foreground"}`}
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-muted-foreground">
                  {selectedFile ? selectedFile.name : "Choose PDF file..."}
                </span>
                {selectedFile && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatFileSize(selectedFile.size)}
                  </span>
                )}
                <input
                  ref={fileInputRef}
                  id="pdf-file"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          {/* Upload status */}
          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{statusLabel()}</span>
            </div>
          )}
          {uploadStatus === "done" && (
            <div className="text-sm text-green-600 font-medium">✓ {statusLabel()}</div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={handleUpload}
            disabled={uploading || !selectedFile || !title.trim()}
            className="w-full gap-2"
          >
            {uploading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />{statusLabel()}</>
            ) : (
              <><Upload className="h-4 w-4" />Upload Manual</>
            )}
          </Button>
        </div>

        {/* Manual list */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Registered Manuals ({manuals.length})</h3>
          {manuals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No manuals uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {manuals.map((manual) => (
                <div
                  key={manual.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-background"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{manual.title}</span>
                      {manual.manual_type && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {manual.manual_type}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {manual.model_name && (
                        <span className="text-xs text-muted-foreground">{manual.model_name}</span>
                      )}
                      {manual.file_size_bytes && (
                        <span className="text-xs text-muted-foreground">
                          · {formatFileSize(manual.file_size_bytes)}
                        </span>
                      )}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Manual</AlertDialogTitle>
                        <AlertDialogDescription>
                          &quot;{manual.title}&quot; を削除しますか？この操作は取り消せません。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(manual.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
