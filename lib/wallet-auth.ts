import { ethers } from "ethers"

export interface WalletSession {
  address: string
  signature: string
  message: string
  timestamp: number
  expiresAt: number
}

export class WalletAuth {
  private static readonly SESSION_KEY = "wallet_session"
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  static async authenticate(signer: ethers.JsonRpcSigner, address: string): Promise<WalletSession> {
    try {
      console.log("🔐 Authenticating wallet:", address)

      const timestamp = Date.now()
      const expiresAt = timestamp + this.SESSION_DURATION

      const message = `Sign this message to authenticate with Tutorial Platform.

Address: ${address}
Timestamp: ${timestamp}
Expires: ${new Date(expiresAt).toISOString()}

This signature will be valid for 24 hours.`

      console.log("📝 Signing message:", message)

      // Sign the message
      const signature = await signer.signMessage(message)

      const session: WalletSession = {
        address: address.toLowerCase(),
        signature,
        message,
        timestamp,
        expiresAt,
      }

      // Store session in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(session))
      }

      console.log("✅ Wallet authenticated successfully")
      return session
    } catch (error) {
      console.error("❌ Authentication failed:", error)
      throw new Error("Failed to authenticate wallet")
    }
  }

  static getSession(): WalletSession | null {
    if (typeof window === "undefined") return null

    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY)
      if (!sessionData) return null

      const session: WalletSession = JSON.parse(sessionData)

      // Check if session is expired
      if (Date.now() > session.expiresAt) {
        this.clearSession()
        return null
      }

      return session
    } catch (error) {
      console.error("Error getting session:", error)
      this.clearSession()
      return null
    }
  }

  static getSessionForAPI(): WalletSession | null {
    const session = this.getSession()
    if (!session) {
      console.log("❌ No valid session found for API call")
      return null
    }

    // Verify session is still valid
    if (!this.verifySession(session)) {
      console.log("❌ Session verification failed for API call")
      this.clearSession()
      return null
    }

    console.log("✅ Valid session found for API call:", session.address)
    return session
  }

  static clearSession(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.SESSION_KEY)
    }
  }

  static isSessionValid(session: WalletSession | null): boolean {
    if (!session) return false
    return Date.now() < session.expiresAt
  }

  static verifySession(session: WalletSession): boolean {
    try {
      // Check if session is expired
      if (Date.now() > session.expiresAt) {
        return false
      }

      // Verify signature
      const recoveredAddress = ethers.verifyMessage(session.message, session.signature)
      return recoveredAddress.toLowerCase() === session.address.toLowerCase()
    } catch (error) {
      console.error("Session verification failed:", error)
      return false
    }
  }

  static async verifySignature(session: WalletSession): Promise<boolean> {
    try {
      // Recover the address from the signature
      const recoveredAddress = ethers.verifyMessage(session.message, session.signature)

      // Check if the recovered address matches the session address
      return recoveredAddress.toLowerCase() === session.address.toLowerCase()
    } catch (error) {
      console.error("Signature verification failed:", error)
      return false
    }
  }
}
