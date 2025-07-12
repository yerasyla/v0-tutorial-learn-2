import { ethers } from "ethers"

export interface WalletSession {
  address: string
  signature: string
  message: string
  timestamp: number
}

export class WalletAuth {
  private static readonly SESSION_KEY = "wallet_auth_session"
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  /**
   * Generate authentication message
   */
  private static generateMessage(address: string, timestamp: number): string {
    return `Welcome to Tutorial Learn Platform!

This request will not trigger a blockchain transaction or cost any gas fees.

Wallet address: ${address}
Timestamp: ${timestamp}

By signing this message, you authenticate your wallet for secure access to the platform.`
  }

  /**
   * Authenticate user with wallet signature
   */
  static async authenticate(signer: ethers.JsonRpcSigner, address: string): Promise<WalletSession> {
    try {
      const timestamp = Date.now()
      const message = this.generateMessage(address, timestamp)

      console.log("Requesting signature for authentication...")
      const signature = await signer.signMessage(message)

      const session: WalletSession = {
        address: address.toLowerCase(),
        signature,
        message,
        timestamp,
      }

      // Store session in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(session))
      }

      console.log("Authentication successful for:", address)
      return session
    } catch (error: any) {
      console.error("Authentication failed:", error)
      throw new Error(`Authentication failed: ${error.message}`)
    }
  }

  /**
   * Get current session from localStorage
   */
  static getSession(): WalletSession | null {
    if (typeof window === "undefined") return null

    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY)
      if (!sessionData) return null

      const session: WalletSession = JSON.parse(sessionData)

      // Check if session is expired
      if (Date.now() - session.timestamp > this.SESSION_DURATION) {
        this.clearSession()
        return null
      }

      return session
    } catch (error) {
      console.error("Failed to get session:", error)
      this.clearSession()
      return null
    }
  }

  /**
   * Verify session signature and expiration
   */
  static verifySession(session: WalletSession): boolean {
    try {
      // Check expiration
      if (Date.now() - session.timestamp > this.SESSION_DURATION) {
        console.log("Session expired")
        return false
      }

      // Verify signature
      const recoveredAddress = ethers.verifyMessage(session.message, session.signature)
      const isValid = recoveredAddress.toLowerCase() === session.address.toLowerCase()

      if (!isValid) {
        console.error("Invalid signature for session")
      }

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
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const session = this.getSession()
    return session ? this.verifySession(session) : false
  }
}
