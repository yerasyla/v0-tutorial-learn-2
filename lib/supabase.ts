import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log("[v0] Supabase environment check:", {
  url: supabaseUrl ? "SET" : "NOT SET",
  key: supabaseAnonKey ? "SET" : "NOT SET",
})

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[v0] Missing Supabase environment variables:", {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? "SET" : "MISSING",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey ? "SET" : "MISSING",
  })
  throw new Error(
    `Missing Supabase environment variables: ${!supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL " : ""}${!supabaseAnonKey ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : ""}`,
  )
}

// Client-side Supabase client using createBrowserClient from @supabase/ssr
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

export const supabase = createClient()

export type Course = {
  id: string
  title: string
  description: string | null
  creator_wallet: string
  created_at: string
  updated_at: string
}

export type Lesson = {
  id: string
  course_id: string
  title: string
  description: string | null
  youtube_url: string
  order_index: number
  created_at: string
  updated_at: string
}

export type CourseWithLessons = Course & {
  lessons: Lesson[]
}

export type Donation = {
  id: string
  course_id: string
  donor_wallet: string
  amount: string
  tx_hash: string
  created_at: string
}

export type UserProfile = {
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
}

// Test connection function - only tests read access
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from("courses").select("count", { count: "exact", head: true })
    if (error) {
      console.error("Supabase connection test failed:", error)
      return false
    }
    console.log("Supabase connection successful (read-only)")
    return true
  } catch (error) {
    console.error("Supabase connection error:", error)
    return false
  }
}
