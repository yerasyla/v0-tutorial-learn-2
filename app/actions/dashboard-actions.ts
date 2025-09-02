"use server"

import { supabaseAdmin } from "@/lib/supabase-admin"
import { SolanaAuth, type SolanaSession } from "@/lib/solana-auth"
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
 * Verify Solana wallet session and extract wallet address
 */
function verifySolanaSession(session: SolanaSession): string {
  console.log("Verifying Solana session:", {
    address: session?.address,
    timestamp: session?.timestamp,
    hasSignature: !!session?.signature,
  })

  if (!session) {
    throw new Error("No authentication session provided")
  }

  // Verify signature
  if (!SolanaAuth.verifySession(session)) {
    throw new Error("Invalid or expired authentication session")
  }

  console.log("Session verified successfully for:", session.address)
  return session.address
}

export async function getDashboardData(session: SolanaSession): Promise<DashboardData> {
  console.log("getDashboardData called with session:", {
    address: session?.address,
    hasSession: !!session,
  })

  try {
    // Verify session
    const authenticatedWallet = verifySolanaSession(session)

    // Fetch user profile from _sol table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles_sol")
      .select("*")
      .eq("wallet_address", authenticatedWallet)
      .single()

    if (profileError && profileError.code !== "PGRST116") {
      console.error("Profile fetch error:", profileError)
      throw new Error(`Failed to fetch profile: ${profileError.message}`)
    }

    // Fetch user's courses with lesson counts from _sol tables
    const { data: courses, error: coursesError } = await supabaseAdmin
      .from("courses_sol")
      .select(`
        *,
        lessons_sol(id, title, order_index)
      `)
      .eq("creator_wallet", authenticatedWallet)
      .order("created_at", { ascending: false })

    if (coursesError) {
      console.error("Courses fetch error:", coursesError)
      throw new Error(`Failed to fetch courses: ${coursesError.message}`)
    }

    const mappedCourses =
      courses?.map((course) => ({
        ...course,
        lessons: course.lessons_sol || [],
      })) || []

    // Calculate stats
    const totalCourses = mappedCourses.length
    const totalLessons = mappedCourses.reduce((sum, course) => sum + (course.lessons?.length || 0), 0)

    const dashboardData: DashboardData = {
      profile: profile || null,
      courses: mappedCourses,
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

export async function deleteCourseAction(courseId: string, session: SolanaSession) {
  console.log("deleteCourseAction called with:", {
    courseId,
    sessionAddress: session?.address,
    hasSession: !!session,
  })

  try {
    // Verify session
    const authenticatedWallet = verifySolanaSession(session)

    // First, verify the user owns this course
    const { data: existingCourse, error: fetchError } = await supabaseAdmin
      .from("courses_sol")
      .select("creator_wallet")
      .eq("id", courseId)
      .single()

    if (fetchError) {
      throw new Error(`Course not found: ${fetchError.message}`)
    }

    if (existingCourse.creator_wallet !== authenticatedWallet) {
      throw new Error("Unauthorized: You can only delete your own courses")
    }

    console.log("Deleting course:", courseId)

    // Delete lessons first (due to foreign key constraint)
    const { error: lessonsError } = await supabaseAdmin.from("lessons_sol").delete().eq("course_id", courseId)

    if (lessonsError) {
      console.error("Lessons deletion error:", lessonsError)
      throw new Error(`Failed to delete lessons: ${lessonsError.message}`)
    }

    // Then delete the course
    const { error: courseError } = await supabaseAdmin.from("courses_sol").delete().eq("id", courseId)

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
