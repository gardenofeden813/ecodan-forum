// ─── Manual types ────────────────────────────────────────────────────────────
export interface Manual {
  id: string
  title: string
  model_name: string | null
  manual_type: string | null
  storage_path: string
  file_url: string
  file_size_bytes: number | null
  page_count: number | null
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

export interface ManualCitation {
  manual_id: string
  manual_title: string
  model_name: string | null
  manual_type: string | null
  page_number: number
  selected_text: string
  // Base64-encoded PNG of the highlighted page region
  highlight_image: string | null
  // Bounding box of the selection on the page (normalized 0-1)
  highlight_rect: { x: number; y: number; width: number; height: number } | null
  file_url: string
}

export const MANUAL_TYPES = [
  "Install Manual",
  "Quick Setup Guide",
  "Service Manual",
  "Submittal",
] as const

export type ManualType = typeof MANUAL_TYPES[number]
