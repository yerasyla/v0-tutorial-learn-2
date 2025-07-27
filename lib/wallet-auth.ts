import { ethers } from "ethers"

interface WalletSession {
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
      const timestamp = Date.now()
      const expiresAt = timestamp + this.SESSION_DURATION

      // Create a message to sign
      const message = `Sign this message to authenticate with Tutorial Platform.

Address: ${address}
Timestamp: ${timestamp}
Expires: ${new Date(expiresAt).toISOString()}

This signature will be valid for 24 hours.`

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

      return session
    } catch (error) {
      console.error("Authentication failed:", error)
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

  static clearSession(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.SESSION_KEY)
    }
  }

  static isSessionValid(session: WalletSession | null): boolean {
    if (!session) return false
    return Date.now() < session.expiresAt
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
