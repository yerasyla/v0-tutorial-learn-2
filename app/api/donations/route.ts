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

    console.log("📊 GET /api/donations - Course ID:", courseId)

    if (!courseId) {
      console.error("❌ Course ID is required")
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    // Fetch donations for the course
    const { data: donations, error } = await supabaseAdmin
      .from("donations")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ Error fetching donations:", error)
      return NextResponse.json({ error: "Failed to fetch donations" }, { status: 500 })
    }

    console.log("✅ Fetched donations:", donations?.length || 0)

    // Calculate total amount
    const totalAmount =
      donations?.reduce((sum, donation) => {
        return sum + Number.parseFloat(donation.amount || "0")
      }, 0) || 0

    return NextResponse.json({
      donations: donations || [],
      totalAmount: totalAmount.toString(),
      donorCount: donations?.length || 0,
    })
  } catch (error) {
    console.error("❌ API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("💰 POST /api/donations - Body:", body)

    const { course_id, donor_wallet, amount, tx_hash, session } = body

    // Validate required fields
    if (!course_id || !donor_wallet || !amount || !tx_hash) {
      console.error("❌ Missing required fields:", { course_id, donor_wallet, amount, tx_hash })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify wallet session if provided
    if (session) {
      console.log("🔐 Verifying wallet session...")
      const isValid = await WalletAuth.verifySignature(session)
      if (!isValid) {
        console.error("❌ Invalid wallet session")
        return NextResponse.json({ error: "Invalid wallet session" }, { status: 401 })
      }

      // Verify the session address matches the donor wallet
      if (session.address.toLowerCase() !== donor_wallet.toLowerCase()) {
        console.error("❌ Session address mismatch")
        return NextResponse.json({ error: "Session address mismatch" }, { status: 401 })
      }
      console.log("✅ Wallet session verified")
    }

    // Check if donation with this tx_hash already exists
    console.log("🔍 Checking for existing donation...")
    const { data: existingDonation } = await supabaseAdmin
      .from("donations")
      .select("id")
      .eq("tx_hash", tx_hash)
      .single()

    if (existingDonation) {
      console.log("⚠️ Donation already exists for tx_hash:", tx_hash)
      return NextResponse.json({ message: "Donation already recorded", donation: existingDonation }, { status: 200 })
    }

    // Insert new donation
    console.log("💾 Inserting new donation...")
    const { data: donation, error: insertError } = await supabaseAdmin
      .from("donations")
      .insert({
        course_id,
        donor_wallet: donor_wallet.toLowerCase(),
        amount: amount.toString(),
        tx_hash,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error("❌ Database error:", insertError)
      return NextResponse.json({ error: "Failed to save donation", details: insertError.message }, { status: 500 })
    }

    console.log("✅ Donation saved successfully:", donation)
    return NextResponse.json({
      success: true,
      donation,
      message: "Donation saved successfully",
    })
  } catch (error) {
    console.error("❌ API error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
