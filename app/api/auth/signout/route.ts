import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = await createClient()
    // Sign out on the server side — this clears the Cookie-based session
    await supabase.auth.signOut()
  } catch (e) {
    console.warn("server signOut error:", e)
  }
  // Return 200 OK — client will handle the redirect
  return NextResponse.json({ ok: true })
}
