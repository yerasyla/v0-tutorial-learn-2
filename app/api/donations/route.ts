import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { WalletAuth } from "@/lib/wallet-auth"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("course_id") || searchParams.get("courseId")

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    console.log("📊 Fetching donations for course:", courseId)

    const { data: donations, error } = await supabaseAdmin
      .from("donations")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ Error fetching donations:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("✅ Donations fetched:", donations?.length || 0)

    return NextResponse.json({
      donations: donations || [],
      count: donations?.length || 0,
    })
  } catch (error) {
    console.error("❌ API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { course_id, donor_wallet, amount, tx_hash, session } = body

    console.log("💾 Saving donation:", { course_id, donor_wallet, amount, tx_hash })

    // Validate required fields
    if (!course_id || !donor_wallet || !amount || !tx_hash) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate session if provided
    if (session && !WalletAuth.isSessionValid(session)) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 })
    }

    // Insert donation using service role
    const { data, error } = await supabaseAdmin
      .from("donations")
      .insert({
        course_id,
        donor_wallet: donor_wallet.toLowerCase(),
        amount,
        tx_hash,
      })
      .select()
      .single()

    if (error) {
      console.error("❌ Error saving donation:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("✅ Donation saved:", data)

    return NextResponse.json({
      success: true,
      donation: data,
    })
  } catch (error) {
    console.error("❌ API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
