import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { WalletAuth } from "@/lib/wallet-auth"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { course_id, donor_wallet, amount, tx_hash, session } = body

    // Validate required fields
    if (!course_id || !donor_wallet || !amount || !tx_hash || !session) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify the session
    if (!WalletAuth.isSessionValid(session)) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 })
    }

    // Verify the signature
    const isValidSignature = await WalletAuth.verifySignature(session)
    if (!isValidSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // Verify the donor wallet matches the session
    if (donor_wallet.toLowerCase() !== session.address.toLowerCase()) {
      return NextResponse.json({ error: "Wallet address mismatch" }, { status: 401 })
    }

    // Validate amount is a positive number
    const amountNum = Number.parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: "Invalid donation amount" }, { status: 400 })
    }

    // Check if course exists
    const { data: course, error: courseError } = await supabaseAdmin
      .from("courses")
      .select("id, creator_wallet")
      .eq("id", course_id)
      .single()

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Check if donation with this tx_hash already exists
    const { data: existingDonation, error: checkError } = await supabaseAdmin
      .from("donations")
      .select("id")
      .eq("tx_hash", tx_hash)
      .single()

    if (existingDonation) {
      return NextResponse.json({ error: "Donation with this transaction hash already exists" }, { status: 409 })
    }

    // Insert the donation
    const { data: donation, error: insertError } = await supabaseAdmin
      .from("donations")
      .insert({
        course_id,
        donor_wallet: donor_wallet.toLowerCase(),
        creator_wallet: course.creator_wallet.toLowerCase(),
        amount: amount.toString(),
        tx_hash,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error inserting donation:", insertError)
      return NextResponse.json({ error: "Failed to save donation" }, { status: 500 })
    }

    return NextResponse.json({ success: true, donation, message: "Donation saved successfully" }, { status: 201 })
  } catch (error) {
    console.error("Error processing donation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const creatorWallet = searchParams.get("creator")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    if (!creatorWallet) {
      return NextResponse.json({ error: "Creator wallet address required" }, { status: 400 })
    }

    // Get recent donations for the creator
    const { data, error } = await supabase
      .from("donations")
      .select("*")
      .eq("creator_wallet", creatorWallet.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch donations" }, { status: 500 })
    }

    return NextResponse.json({ donations: data })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
