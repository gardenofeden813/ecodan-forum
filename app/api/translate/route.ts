import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { text, targetLang } = await request.json()

    if (!text || !text.trim()) {
      return NextResponse.json({ translatedText: text })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Translation service is not configured." },
        { status: 500 }
      )
    }

    const targetLanguage = targetLang === "ja" ? "Japanese" : "English"

    // Use the configured base URL (supports proxied endpoints)
    const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate the following text into ${targetLanguage}. Output only the translated text — no explanations, no quotes, no extra commentary.`,
          },
          { role: "user", content: text },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      console.error("OpenAI translate error:", err)
      return NextResponse.json(
        { error: "Translation service unavailable." },
        { status: 502 }
      )
    }

    const data = await response.json()
    const translatedText = data.choices?.[0]?.message?.content?.trim() ?? ""

    if (!translatedText) {
      return NextResponse.json(
        { error: "Empty translation response." },
        { status: 500 }
      )
    }

    return NextResponse.json({ translatedText })
  } catch (error) {
    console.error("Translation error:", error)
    return NextResponse.json(
      { error: "Failed to translate. Please try again." },
      { status: 500 }
    )
  }
}
