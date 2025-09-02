export interface SolanaSession {
  address: string
  signature: string
  message: string
  timestamp: number
  expiresAt: number
}

export class SolanaAuth {
  private static readonly SESSION_KEY = "solana_session"
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  private static setCookie(name: string, value: string, expiresAt: number) {
    if (typeof window !== "undefined") {
      // Client-side: use document.cookie
      const expires = new Date(expiresAt).toUTCString()
      document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
    }
  }

  private static getCookie(name: string): string | null {
    if (typeof window !== "undefined") {
      // Client-side: use document.cookie
      const cookies = document.cookie.split(";")
      for (const cookie of cookies) {
        const [cookieName, cookieValue] = cookie.trim().split("=")
        if (cookieName === name) {
          return decodeURIComponent(cookieValue)
        }
      }
    } else {
      // Server-side: try to get from headers (this is a fallback)
      try {
        const { cookies } = require("next/headers")
        const cookieStore = cookies()
        const cookie = cookieStore.get(name)
        return cookie?.value || null
      } catch (error) {
        // If headers are not available, return null
        return null
      }
    }
    return null
  }

  private static clearCookie(name: string) {
    if (typeof window !== "undefined") {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
    }
  }

  static async authenticate(
    signMessage: (message: Uint8Array) => Promise<Uint8Array>,
    address: string,
  ): Promise<SolanaSession> {
    try {
      console.log("🔐 Authenticating Solana wallet:", address)

      const timestamp = Date.now()
      const expiresAt = timestamp + this.SESSION_DURATION

      const message = `Sign this message to authenticate with Tutorial Platform.

Address: ${address}
Timestamp: ${timestamp}
Expires: ${new Date(expiresAt).toISOString()}

This signature will be valid for 24 hours.`

      console.log("📝 Signing Solana message:", message)

      // Convert message to Uint8Array for Solana signing
      const messageBytes = new TextEncoder().encode(message)

      // Sign the message
      const signatureBytes = await signMessage(messageBytes)

      // Convert signature to base64 string for storage
      const signature = Buffer.from(signatureBytes).toString("base64")

      const session: SolanaSession = {
        address,
        signature,
        message,
        timestamp,
        expiresAt,
      }

      const sessionJson = JSON.stringify(session)
      if (typeof window !== "undefined") {
        localStorage.setItem(this.SESSION_KEY, sessionJson)
      }
      this.setCookie(this.SESSION_KEY, sessionJson, expiresAt)

      console.log("✅ Solana wallet authenticated successfully")
      return session
    } catch (error) {
      console.error("❌ Solana authentication failed:", error)
      throw new Error("Failed to authenticate Solana wallet")
    }
  }

  static getSession(): SolanaSession | null {
    try {
      let sessionData: string | null = null

      if (typeof window !== "undefined") {
        sessionData = localStorage.getItem(this.SESSION_KEY)
      }

      if (!sessionData) {
        sessionData = this.getCookie(this.SESSION_KEY)
      }

      if (!sessionData) return null

      const session: SolanaSession = JSON.parse(sessionData)

      // Check if session is expired
      if (Date.now() > session.expiresAt) {
        this.clearSession()
        return null
      }

      return session
    } catch (error) {
      console.error("Error getting Solana session:", error)
      this.clearSession()
      return null
    }
  }

  static getSessionForAPI(): SolanaSession | null {
    const session = this.getSession()
    if (!session) {
      console.log("❌ No valid Solana session found for API call")
      return null
    }

    // Verify session is still valid
    if (!this.verifySession(session)) {
      console.log("❌ Solana session verification failed for API call")
      this.clearSession()
      return null
    }

    console.log("✅ Valid Solana session found for API call:", session.address)
    return session
  }

  static clearSession(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.SESSION_KEY)
    }
    this.clearCookie(this.SESSION_KEY)
  }

  static isSessionValid(session: SolanaSession | null): boolean {
    if (!session) return false
    return Date.now() < session.expiresAt
  }

  static verifySession(session: SolanaSession): boolean {
    try {
      // Check if session is expired
      if (Date.now() > session.expiresAt) {
        return false
      }

      // For Solana, we'll do basic validation
      // In a production app, you'd want to verify the signature against the public key
      return session.address && session.signature && session.message
    } catch (error) {
      console.error("Solana session verification failed:", error)
      return false
    }
  }

  static async verifySignature(session: SolanaSession): Promise<boolean> {
    try {
      // For now, we'll do basic validation
      // In production, you'd verify the signature using Solana's crypto functions
      return session.address && session.signature && session.message
    } catch (error) {
      console.error("Solana signature verification failed:", error)
      return false
    }
  }
}
