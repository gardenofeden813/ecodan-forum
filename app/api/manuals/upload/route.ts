import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// POST /api/manuals/upload — upload a PDF to the manuals bucket (admin only)
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

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
    // iOS Safari may send PDF with empty or different MIME type
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    if (!isPdf) {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 })
    }

    const timestamp = Date.now()
    const random = Math.random().toString(36).slice(2, 8)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const path = `${user.id}/${timestamp}-${random}-${safeName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from("manuals")
      .upload(path, buffer, {
        contentType: "application/pdf",
        upsert: false,
      })

    if (uploadError) {
      console.error("Manual upload error:", uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Generate a signed URL (valid for 10 years = long-lived)
    const { data: signedData, error: signedError } = await supabase.storage
      .from("manuals")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10)

    if (signedError || !signedData) {
      return NextResponse.json({ error: "Failed to generate URL" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      path,
      url: signedData.signedUrl,
      file_size_bytes: file.size,
    })
  } catch (e) {
    console.error("Manual upload error:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
