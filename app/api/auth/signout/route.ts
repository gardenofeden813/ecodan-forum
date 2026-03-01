import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  try {
    const cookieStore = await cookies()
    // Delete all Supabase auth cookies explicitly
    // Supabase uses cookies named like: sb-<project-ref>-auth-token, sb-<project-ref>-auth-token.0, etc.
    const allCookies = cookieStore.getAll()
    for (const cookie of allCookies) {
      if (cookie.name.startsWith("sb-") && cookie.name.includes("auth")) {
        cookieStore.delete(cookie.name)
      }
    }
  } catch (e) {
    console.warn("server signOut cookie deletion error:", e)
  }
  return NextResponse.json({ ok: true })
}
