import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST /api/messages — add a reply to a thread
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { threadId, content, attachments, parentId } = body

    if (!threadId?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "threadId and content are required" }, { status: 400 })
    }

    const { error: msgError } = await supabase.from("messages").insert({
      thread_id: threadId,
      content: content.trim(),
      sender_id: user.id,
      attachments: attachments && attachments.length > 0 ? attachments : [],
      ...(parentId ? { parent_id: parentId } : {}),
    })

    if (msgError) {
      console.error("Message insert error:", msgError)
      return NextResponse.json({ error: msgError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    console.error("POST /api/messages error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
