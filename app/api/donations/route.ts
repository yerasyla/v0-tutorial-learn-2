import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { SolanaAuth } from "@/lib/solana-auth"

async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server component context - can be ignored with middleware
        }
      },
    },
  })
}

function createAdminClient() {
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("course_id") || searchParams.get("courseId")

    console.log("📊 GET /api/donations - Course ID:", courseId)

    if (!courseId) {
      console.error("❌ Course ID is required")
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    const { data: donations, error } = await supabaseAdmin
      .from("donations_sol")
      .select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ Error fetching donations:", error)
      return NextResponse.json({ error: "Failed to fetch donations" }, { status: 500 })
    }

    console.log("✅ Fetched donations:", donations?.length || 0)

    const totalAmount =
      donations?.reduce((sum, donation) => {
        const amount = Number.parseFloat(donation.amount_sol || "0")
        return sum + amount
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

    const {
      course_id,
      donor_wallet_address,
      amount_sol,
      amount_lamports,
      transaction_signature,
      block_height,
      session,
    } = body

    if (!course_id || !donor_wallet_address || !amount_sol || !amount_lamports || !transaction_signature) {
      console.error("❌ Missing required fields:", {
        course_id,
        donor_wallet_address,
        amount_sol,
        amount_lamports,
        transaction_signature,
      })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify wallet session if provided
    if (session) {
      console.log("🔐 Verifying Solana wallet session...")
      const isValid = await SolanaAuth.verifySignature(session)
      if (!isValid) {
        console.error("❌ Invalid Solana wallet session")
        return NextResponse.json({ error: "Invalid wallet session" }, { status: 401 })
      }

      // Verify the session address matches the donor wallet
      if (session.address !== donor_wallet_address) {
        console.error("❌ Session address mismatch")
        return NextResponse.json({ error: "Session address mismatch" }, { status: 401 })
      }
      console.log("✅ Solana wallet session verified")
    }

    const supabaseAdmin = createAdminClient()

    console.log("🔍 Checking for existing donation...")
    const { data: existingDonation } = await supabaseAdmin
      .from("donations_sol")
      .select("id")
      .eq("transaction_signature", transaction_signature)
      .single()

    if (existingDonation) {
      console.log("⚠️ Donation already exists for transaction:", transaction_signature)
      return NextResponse.json({ message: "Donation already recorded", donation: existingDonation }, { status: 200 })
    }

    console.log("💾 Inserting new SOL donation...")
    const donationData = {
      course_id,
      donor_wallet_address,
      transaction_signature,
      amount_lamports,
      amount_sol: amount_sol.toString(),
      block_height: block_height || null,
      confirmation_status: "confirmed",
      created_at: new Date().toISOString(),
      confirmed_at: new Date().toISOString(),
    }

    const { data: donation, error: insertError } = await supabaseAdmin
      .from("donations_sol")
      .insert(donationData)
      .select()
      .single()

    if (insertError) {
      console.error("❌ Database error:", insertError)
      return NextResponse.json({ error: "Failed to save donation", details: insertError.message }, { status: 500 })
    }

    console.log("✅ SOL donation saved successfully:", donation)
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
