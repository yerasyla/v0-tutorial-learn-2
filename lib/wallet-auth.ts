export class WalletAuth {
  private static readonly SESSION_KEY = "wallet_session"
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  static async authenticate(signer: any, address: string) {
    try {
      console.log("🔐 Authenticating wallet:", address)

      const message = `Sign this message to authenticate your wallet: ${address}\nTimestamp: ${Date.now()}`
      const signature = await signer.signMessage(message)

      const session = {
        address: address.toLowerCase(),
        signature,
        message,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.SESSION_DURATION,
      }

      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session))
      console.log("✅ Wallet authenticated successfully")

      return session
    } catch (error) {
      console.error("❌ Wallet authentication failed:", error)
      throw error
    }
  }

  static getSession() {
    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY)
      if (!sessionData) return null

      const session = JSON.parse(sessionData)
      return this.isSessionValid(session) ? session : null
    } catch (error) {
      console.error("❌ Error getting session:", error)
      return null
    }
  }

  static isSessionValid(session: any): boolean {
    if (!session || !session.expiresAt) return false
    return Date.now() < session.expiresAt
  }

  static clearSession() {
    localStorage.removeItem(this.SESSION_KEY)
  }
}
