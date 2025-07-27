import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("course_id") || searchParams.get("courseId")

    console.log("📊 Fetching donations for course:", courseId)

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
    console.log("💰 Saving donation:", body)

    const { courseId, donorWallet, amount, txHash } = body

    // Validate required fields
    if (!courseId || !donorWallet || !amount || !txHash) {
      console.error("❌ Missing required fields:", { courseId, donorWallet, amount, txHash })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if donation with this tx_hash already exists
    const { data: existing } = await supabaseAdmin.from("donations").select("id").eq("tx_hash", txHash).single()

    if (existing) {
      console.log("⚠️ Donation already exists for tx_hash:", txHash)
      return NextResponse.json({ error: "Donation already recorded" }, { status: 409 })
    }

    // Insert donation
    const { data: donation, error } = await supabaseAdmin
      .from("donations")
      .insert({
        course_id: courseId,
        donor_wallet: donorWallet.toLowerCase(),
        amount: amount.toString(),
        tx_hash: txHash,
      })
      .select()
      .single()

    if (error) {
      console.error("❌ Error saving donation:", error)
      return NextResponse.json({ error: "Failed to save donation" }, { status: 500 })
    }

    console.log("✅ Donation saved successfully:", donation.id)

    return NextResponse.json({
      success: true,
      donation,
    })
  } catch (error) {
    console.error("❌ API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
