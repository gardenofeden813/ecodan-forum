import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import OpenAI from "openai"

export async function POST(request: NextRequest) {
  try {
    const { threadId, threadTitle, threadContent, messages, tags } = await request.json()

    if (!threadId || !threadTitle) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if knowledge entry already exists for this thread
    const { data: existing } = await supabase
      .from("knowledge_entries")
      .select("id")
      .eq("thread_id", threadId)
      .single()

    if (existing) {
      return NextResponse.json({ message: "Already summarized", id: existing.id })
    }

    // Build conversation text for AI
    const conversationText = [
      `[Thread Title] ${threadTitle}`,
      `[Original Post]\n${threadContent}`,
      messages && messages.length > 0
        ? `[Replies]\n${messages.map((m: { author: string; content: string }) => `${m.author}: ${m.content}`).join("\n\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n")

    // Generate summary using OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    })

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are a technical support assistant for the ecodan forum, a community for Mitsubishi Electric heat pump systems.
When a thread is marked as resolved, summarize the issue and solution clearly and concisely for future reference in the knowledge base.
Respond in English only. Output valid JSON in the following format:
{
  "summary": "A concise summary (2-4 sentences) describing the problem and how it was resolved."
}`,
        },
        {
          role: "user",
          content: `Please summarize the following resolved support thread:\n\n${conversationText}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    })

    const result = JSON.parse(completion.choices[0].message.content || "{}")
    const summaryContent = result.summary || "No summary could be generated."

    // Save to knowledge_entries
    const { data: entry, error: insertError } = await supabase
      .from("knowledge_entries")
      .insert({
        thread_id: threadId,
        title: threadTitle,
        summary_content: summaryContent,
        tags: tags || [],
      })
      .select()
      .single()

    if (insertError) {
      console.error("Insert error:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, entry })
  } catch (error: unknown) {
    console.error("Summarize error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
