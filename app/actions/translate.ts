"use server"

export type TranslateResult =
  | { success: true; translatedText: string }
  | { success: false; error: string }

export async function translateText(
  text: string,
  targetLang: "ja" | "en"
): Promise<TranslateResult> {
  if (!text.trim()) return { success: true, translatedText: text }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { success: false, error: "Translation service is not configured." }
  }

  const targetLanguage = targetLang === "ja" ? "Japanese" : "English"

  try {
    const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
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
            content: `You are a professional translator. Translate the user's message into ${targetLanguage}. Output only the translated text — no explanations, no quotes, no extra commentary.`,
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
      return { success: false, error: "Translation service unavailable." }
    }

    const data = await response.json()
    const translatedText = data.choices?.[0]?.message?.content?.trim() ?? ""

    if (!translatedText) {
      return { success: false, error: "Empty translation response." }
    }

    return { success: true, translatedText }
  } catch (error) {
    console.error("Translation error:", error)
    return { success: false, error: "Failed to translate. Please try again." }
  }
}
