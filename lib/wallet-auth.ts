import { ethers } from "ethers"

export interface WalletSession {
  address: string
  message: string
  signature: string
  timestamp: number
  expiresAt: number
}

export class WalletAuth {
  private static readonly SESSION_KEY = "wallet_auth_session"
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  /**
   * Create authentication message for wallet signing
   */
  static createAuthMessage(address: string, timestamp: number): string {
    return `Welcome to Tutorial Platform!

Please sign this message to authenticate your wallet.

Wallet: ${address}
Timestamp: ${timestamp}

This signature will be valid for 24 hours.`
  }

  /**
   * Create a new authentication session
   */
  static async createSession(signer: ethers.Signer): Promise<WalletSession> {
    const address = await signer.getAddress()
    const timestamp = Date.now()
    const expiresAt = timestamp + this.SESSION_DURATION
    const message = this.createAuthMessage(address, timestamp)

    console.log("Creating authentication session for:", address)

    try {
      const signature = await signer.signMessage(message)

      const session: WalletSession = {
        address: address.toLowerCase(),
        message,
        signature,
        timestamp,
        expiresAt,
      }

      // Store session in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(session))
      }

      console.log("Session created and stored:", {
        address: session.address,
        hasSignature: !!session.signature,
        timestamp: session.timestamp,
        expiresAt: session.expiresAt,
      })

      return session
    } catch (error) {
      console.error("Failed to create authentication session:", error)
      throw new Error("Failed to sign authentication message")
    }
  }

  /**
   * Get current session from localStorage
   */
  static getSession(): WalletSession | null {
    if (typeof window === "undefined") return null

    try {
      const sessionStr = localStorage.getItem(this.SESSION_KEY)
      if (!sessionStr) {
        console.log("No session found in localStorage")
        return null
      }

      const session: WalletSession = JSON.parse(sessionStr)

      // Validate session structure
      if (!session.address || !session.message || !session.signature || !session.timestamp || !session.expiresAt) {
        console.error("Invalid session structure:", {
          hasAddress: !!session.address,
          hasMessage: !!session.message,
          hasSignature: !!session.signature,
          hasTimestamp: !!session.timestamp,
          hasExpiresAt: !!session.expiresAt,
        })
        this.clearSession()
        return null
      }

      // Check if session is expired
      if (Date.now() > session.expiresAt) {
        console.log("Session expired, clearing...")
        this.clearSession()
        return null
      }

      console.log("Retrieved valid session for:", session.address)
      return session
    } catch (error) {
      console.error("Error retrieving session:", error)
      this.clearSession()
      return null
    }
  }

  /**
   * Verify session signature and expiration
   */
  static verifySession(session: WalletSession): boolean {
    try {
      console.log("Verifying session signature...")

      // Check expiration
      if (Date.now() > session.expiresAt) {
        console.log("Session expired")
        return false
      }

      // Verify signature
      const recoveredAddress = ethers.verifyMessage(session.message, session.signature)
      const isValid = recoveredAddress.toLowerCase() === session.address.toLowerCase()

      console.log("Session verification result:", {
        isValid,
        recoveredAddress,
        sessionAddress: session.address,
      })

      return isValid
    } catch (error) {
      console.error("Session verification failed:", error)
      return false
    }
  }

  /**
   * Clear current session
   */
  static clearSession(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.SESSION_KEY)
    }
    console.log("Session cleared")
  }

  /**
   * Check if user has valid session
   */
  static hasValidSession(): boolean {
    const session = this.getSession()
    return session ? this.verifySession(session) : false
  }

  /**
   * Get session for API calls
   */
  static getSessionForAPI(): WalletSession | null {
    const session = this.getSession()
    if (!session || !this.verifySession(session)) {
      return null
    }
    return session
  }
}

/**
 * Helper wrapper so consumers can `import { verifyWalletSession }`
 * instead of accessing the class method manually.
 */
export function verifyWalletSession(session: WalletSession): boolean {
  return WalletAuth.verifySession(session)
}
