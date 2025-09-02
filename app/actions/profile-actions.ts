"use server"

import { revalidatePath } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { SolanaAuth, type SolanaSession } from "@/lib/solana-auth"

export interface ProfileUpdateData {
  display_name: string
  avatar_url: string
  about_me: string
  website_url: string
  twitter_handle: string
}

/**
 * Verify the Solana wallet session and return the wallet address.
 */
function verifySolanaSession(session: SolanaSession): string {
  console.log("[SERVER] Verifying Solana wallet session:", {
    hasSession: !!session,
    address: session?.address,
    timestamp: session?.timestamp,
    hasSignature: !!session?.signature,
    hasMessage: !!session?.message,
    sessionType: typeof session,
  })

  if (!session) {
    throw new Error("No authentication session provided")
  }

  if (!session.address || !session.message || !session.signature) {
    console.error("[SERVER] Session missing required fields:", {
      hasAddress: !!session.address,
      hasMessage: !!session.message,
      hasSignature: !!session.signature,
    })
    throw new Error("Invalid session structure")
  }

  // Verify Solana signature
  if (!SolanaAuth.verifySignature(session)) {
    throw new Error("Invalid or expired authentication session")
  }

  console.log("[SERVER] Solana session verified successfully for:", session.address)
  return session.address
}

export async function updateProfile(walletAddress: string, profileData: ProfileUpdateData, session: SolanaSession) {
  console.log("[SERVER] updateProfile called with:", {
    walletAddress,
    sessionAddress: session?.address,
    hasSession: !!session,
    sessionKeys: session ? Object.keys(session) : [],
  })

  try {
    // Verify session
    const authenticatedWallet = verifySolanaSession(session)

    // Security check: ensure the authenticated wallet matches the profile being updated
    if (walletAddress !== authenticatedWallet) {
      throw new Error("Unauthorized: You can only edit your own profile")
    }

    // Clean Twitter handle (remove @ if present)
    const cleanTwitterHandle = profileData.twitter_handle.replace(/^@/, "")

    const updateData = {
      solana_wallet_address: walletAddress,
      display_name: profileData.display_name.trim() || null,
      avatar_url: profileData.avatar_url.trim() || null,
      about_me: profileData.about_me.trim() || null,
      website_url: profileData.website_url.trim() || null,
      twitter_handle: cleanTwitterHandle.trim() || null,
      updated_at: new Date().toISOString(),
    }

    console.log("[SERVER] Updating profile with data:", updateData)

    // Use upsert to handle both insert and update
    const { data: profile, error } = await supabaseAdmin
      .from("user_profiles_sol")
      .upsert(updateData, {
        onConflict: "solana_wallet_address",
      })
      .select()
      .single()

    console.log("[SERVER] Profile upsert result:", { profile, error })

    if (error) {
      console.error("[SERVER] Profile upsert error:", error)
      throw new Error(`Failed to update profile: ${error.message}`)
    }

    console.log("[SERVER] Profile updated successfully")
    revalidatePath(`/creator/${walletAddress}`)
    return { success: true, profile }
  } catch (error: any) {
    console.error("[SERVER] Error in updateProfile:", error)
    throw error
  }
}

export async function getProfile(walletAddress: string) {
  console.log("[SERVER] getProfile called with:", { walletAddress })

  try {
    const { data: profile, error } = await supabaseAdmin
      .from("user_profiles_sol")
      .select("*")
      .eq("solana_wallet_address", walletAddress)
      .single()

    console.log("[SERVER] Profile fetch result:", { profile, error })

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" error, which is expected for new users
      throw new Error(`Failed to fetch profile: ${error.message}`)
    }

    return profile || null
  } catch (error) {
    console.error("[SERVER] Error in getProfile:", error)
    throw error
  }
}
