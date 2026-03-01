import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

// POST /api/manuals/upload
// Body: { fileName: string }
// Returns: { signedUrl, token, path, publicUrl }
// The client uploads the file directly to Supabase Storage via XHR PUT to signedUrl.
// This avoids Next.js body size limits entirely.
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Check admin
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .single()
    if (!adminRow) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 })

    const body = await request.json()
    const { fileName } = body as { fileName: string }
    if (!fileName) return NextResponse.json({ error: "fileName required" }, { status: 400 })

    const timestamp = Date.now()
    const random = Math.random().toString(36).slice(2, 8)
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
    const storagePath = `${user.id}/${timestamp}-${random}-${safeName}`

    // Use service role key if available (needed for createSignedUploadUrl)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey
    )

    const { data: signedData, error: signedError } = await adminClient.storage
      .from("manuals")
      .createSignedUploadUrl(storagePath)

    if (signedError || !signedData) {
      console.error("createSignedUploadUrl error:", signedError)
      return NextResponse.json({ error: signedError?.message || "Failed to create signed URL" }, { status: 500 })
    }

    const { data: publicUrlData } = adminClient.storage
      .from("manuals")
      .getPublicUrl(storagePath)

    return NextResponse.json({
      signedUrl: signedData.signedUrl,
      token: signedData.token,
      path: storagePath,
      publicUrl: publicUrlData.publicUrl,
    })
  } catch (e) {
    console.error("Signed URL generation error:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
