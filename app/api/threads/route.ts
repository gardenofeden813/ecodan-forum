import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST /api/threads — create a new thread + first message
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { title, category, messageBody } = body

    if (!title?.trim() || !category?.trim()) {
      return NextResponse.json({ error: "title and category are required" }, { status: 400 })
    }

    // Insert the thread
    const { data: thread, error: threadError } = await supabase
      .from("threads")
      .insert({
        title: title.trim(),
        category,
        status: "open",
        created_by: user.id,
      })
      .select()
      .single()

    if (threadError || !thread) {
      console.error("Thread insert error:", threadError)
      return NextResponse.json({ error: threadError?.message ?? "Failed to create thread" }, { status: 500 })
    }

    // Insert the first message (body)
    if (messageBody?.trim()) {
      const { error: msgError } = await supabase.from("messages").insert({
        thread_id: thread.id,
        content: messageBody.trim(),
        sender_id: user.id,
        attachments: [],
      })
      if (msgError) {
        console.error("Message insert error:", msgError)
        // Don't fail — thread was created, just body message failed
      }
    }

    return NextResponse.json({ thread }, { status: 201 })
  } catch (err) {
    console.error("POST /api/threads error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
