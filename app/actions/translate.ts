"use server"

export type TranslateResult = 
  | { success: true; translatedText: string }
  | { success: false; error: string }

export async function translateText(
  text: string,
  targetLang: "ja" | "en"
): Promise<TranslateResult> {
  // Google Translate API requires GOOGLE_TRANSLATE_API_KEY environment variable
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY

  if (!apiKey) {
    // If no API key, return a mock translation for demo purposes
    // In production, this should return an error
    console.warn("[v0] GOOGLE_TRANSLATE_API_KEY not set, using demo mode")
    
    // Demo: Just indicate that translation would happen
    if (targetLang === "ja") {
      return {
        success: true,
        translatedText: `[Translated to Japanese]\n${text}`,
      }
    } else {
      return {
        success: true,
        translatedText: `[Translated to English]\n${text}`,
      }
    }
  }

  try {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: text,
        target: targetLang,
        format: "text",
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("[v0] Google Translate API error:", errorData)
      return {
        success: false,
        error: "Translation service unavailable",
      }
    }

    const data = await response.json()
    const translatedText = data.data.translations[0].translatedText

    return {
      success: true,
      translatedText,
    }
  } catch (error) {
    console.error("[v0] Translation error:", error)
    return {
      success: false,
      error: "Failed to translate",
    }
  }
}
