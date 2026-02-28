export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          updated_at?: string | null
        }
      }
      threads: {
        Row: {
          id: string
          title: string
          category: string
          status: string
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          title: string
          category: string
          status?: string
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          title?: string
          category?: string
          status?: string
          created_at?: string
          created_by?: string
        }
      }
      messages: {
        Row: {
          id: string
          thread_id: string
          content: string
          sender_id: string
          created_at: string
        }
        Insert: {
          id?: string
          thread_id: string
          content: string
          sender_id: string
          created_at?: string
        }
        Update: {
          id?: string
          thread_id?: string
          content?: string
          sender_id?: string
          created_at?: string
        }
      }
      knowledge_entries: {
        Row: {
          id: string
          thread_id: string | null
          title: string
          summary_content: string
          tags: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          thread_id?: string | null
          title: string
          summary_content: string
          tags?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          thread_id?: string | null
          title?: string
          summary_content?: string
          tags?: string[] | null
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
