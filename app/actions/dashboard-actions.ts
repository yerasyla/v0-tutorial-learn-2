"use server"

import { supabaseAdmin } from "@/lib/supabase-admin"
import { WalletAuth, type WalletSession } from "@/lib/wallet-auth"

/**
 * Verify wallet session and extract wallet address
 */
function verifyWalletSession(session: WalletSession): string {
  console.log("Verifying wallet session:", { address: session.address, timestamp: session.timestamp })

  // Verify signature
  if (!WalletAuth.verifySession(session)) {
    throw new Error("Invalid or expired authentication session")
  }

  console.log("Session verified successfully for:", session.address)
  return session.address.toLowerCase()
}

export async function getDashboardData(session: WalletSession) {
  console.log("getDashboardData called with session:", session?.address)

  try {
    // Verify session
    const walletAddress = verifyWalletSession(session)

    // Get user's courses
    const { data: courses, error: coursesError } = await supabaseAdmin
      .from("courses")
      .select(`
        *,
        lessons(id, title, order_index)
      `)
      .eq("creator_wallet", walletAddress)
      .order("created_at", { ascending: false })

    if (coursesError) {
      throw new Error(`Failed to fetch courses: ${coursesError.message}`)
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("*")
      .eq("wallet_address", walletAddress)
      .single()

    // Profile error is OK if user hasn't created one yet
    if (profileError && profileError.code !== "PGRST116") {
      console.error("Profile fetch error:", profileError)
    }

    // Get donation stats
    const { data: donations, error: donationsError } = await supabaseAdmin
      .from("donations")
      .select("amount, course_id")
      .in("course_id", courses?.map((c) => c.id) || [])

    if (donationsError) {
      console.error("Donations fetch error:", donationsError)
    }

    const totalDonations = donations?.reduce((sum, d) => sum + Number.parseFloat(d.amount), 0) || 0
    const totalCourses = courses?.length || 0
    const totalLessons = courses?.reduce((sum, course) => sum + (course.lessons?.length || 0), 0) || 0

    return {
      courses: courses || [],
      profile: profile || null,
      stats: {
        totalCourses,
        totalLessons,
        totalDonations,
      },
    }
  } catch (error) {
    console.error("Error in getDashboardData:", error)
    throw error
  }
}
