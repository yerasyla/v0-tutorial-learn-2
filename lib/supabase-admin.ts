import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables for admin client")
}

// Server-side admin client with full permissions
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Export alias for backward compatibility
export const supabase = supabaseAdmin

// Test admin connection
export const testAdminConnection = async () => {
  try {
    const { data, error } = await supabaseAdmin.from("courses").select("count", { count: "exact", head: true })
    if (error) {
      console.error("Supabase admin connection test failed:", error)
      return false
    }
    console.log("Supabase admin connection successful")
    return true
  } catch (error) {
    console.error("Supabase admin connection error:", error)
    return false
  }
}
