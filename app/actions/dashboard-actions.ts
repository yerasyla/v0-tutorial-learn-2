"use server"

import { supabaseAdmin } from "@/lib/supabase-admin"
import { WalletAuth, type WalletSession } from "@/lib/wallet-auth"
import { revalidatePath } from "next/cache"

export interface DashboardData {
  profile: {
    id: string
    wallet_address: string
    display_name: string | null
    avatar_url: string | null
    about_me: string | null
    website_url: string | null
    twitter_handle: string | null
    is_verified: boolean
    verification_date: string | null
    verification_notes: string | null
    created_at: string
    updated_at: string
  } | null
  courses: Array<{
    id: string
    title: string
    description: string | null
    creator_wallet: string
    created_at: string
    updated_at: string
    lessons?: Array<{
      id: string
      title: string
      order_index: number
    }>
  }>
  stats: {
    totalCourses: number
    totalLessons: number
  }
}

/**
 * Verify wallet session and extract wallet address
 */
function verifyWalletSession(session: WalletSession): string {
  console.log("Verifying wallet session:", {
    address: session?.address,
    timestamp: session?.timestamp,
    hasSignature: !!session?.signature,
  })

  if (!session) {
    throw new Error("No authentication session provided")
  }

  // Verify signature
  if (!WalletAuth.verifySession(session)) {
    throw new Error("Invalid or expired authentication session")
  }

  console.log("Session verified successfully for:", session.address)
  return session.address.toLowerCase()
}

export async function getDashboardData(session: WalletSession): Promise<DashboardData> {
  console.log("getDashboardData called with session:", {
    address: session?.address,
    hasSession: !!session,
  })

  try {
    // Verify session
    const authenticatedWallet = verifyWalletSession(session)

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("*")
      .eq("wallet_address", authenticatedWallet)
      .single()

    if (profileError && profileError.code !== "PGRST116") {
      console.error("Profile fetch error:", profileError)
      throw new Error(`Failed to fetch profile: ${profileError.message}`)
    }

    // Fetch user's courses with lesson counts
    const { data: courses, error: coursesError } = await supabaseAdmin
      .from("courses")
      .select(`
        *,
        lessons(id, title, order_index)
      `)
      .eq("creator_wallet", authenticatedWallet)
      .order("created_at", { ascending: false })

    if (coursesError) {
      console.error("Courses fetch error:", coursesError)
      throw new Error(`Failed to fetch courses: ${coursesError.message}`)
    }

    // Calculate stats
    const totalCourses = courses?.length || 0
    const totalLessons = courses?.reduce((sum, course) => sum + (course.lessons?.length || 0), 0) || 0

    const dashboardData: DashboardData = {
      profile: profile || null,
      courses: courses || [],
      stats: {
        totalCourses,
        totalLessons,
      },
    }

    console.log("Dashboard data loaded successfully:", {
      hasProfile: !!profile,
      coursesCount: totalCourses,
      totalLessons,
    })

    return dashboardData
  } catch (error: any) {
    console.error("Error in getDashboardData:", error)
    throw error
  }
}

export async function deleteCourseAction(courseId: string, session: WalletSession) {
  console.log("deleteCourseAction called with:", {
    courseId,
    sessionAddress: session?.address,
    hasSession: !!session,
  })

  try {
    // Verify session
    const authenticatedWallet = verifyWalletSession(session)

    // First, verify the user owns this course
    const { data: existingCourse, error: fetchError } = await supabaseAdmin
      .from("courses")
      .select("creator_wallet")
      .eq("id", courseId)
      .single()

    if (fetchError) {
      throw new Error(`Course not found: ${fetchError.message}`)
    }

    if (existingCourse.creator_wallet.toLowerCase() !== authenticatedWallet) {
      throw new Error("Unauthorized: You can only delete your own courses")
    }

    console.log("Deleting course:", courseId)

    // Delete lessons first (due to foreign key constraint)
    const { error: lessonsError } = await supabaseAdmin.from("lessons").delete().eq("course_id", courseId)

    if (lessonsError) {
      console.error("Lessons deletion error:", lessonsError)
      throw new Error(`Failed to delete lessons: ${lessonsError.message}`)
    }

    // Then delete the course
    const { error: courseError } = await supabaseAdmin.from("courses").delete().eq("id", courseId)

    if (courseError) {
      console.error("Course deletion error:", courseError)
      throw new Error(`Failed to delete course: ${courseError.message}`)
    }

    console.log("Course deleted successfully")
    revalidatePath("/courses")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error: any) {
    console.error("Error in deleteCourseAction:", error)
    throw error
  }
}
