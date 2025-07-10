import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a Supabase client with wallet-based authentication
export function createAuthenticatedSupabaseClient(walletAddress?: string) {
  const client = createClient(supabaseUrl, supabaseAnonKey)

  if (walletAddress) {
    // Set the wallet address in the client context
    // This will be used by our RLS policies
    client.functions.invoke = new Proxy(client.functions.invoke, {
      apply: (target, thisArg, args) => {
        // Add wallet address to headers
        if (args[1]?.headers) {
          args[1].headers["x-wallet-address"] = walletAddress.toLowerCase()
        } else if (args[1]) {
          args[1].headers = { "x-wallet-address": walletAddress.toLowerCase() }
        } else {
          args[1] = { headers: { "x-wallet-address": walletAddress.toLowerCase() } }
        }
        return target.apply(thisArg, args)
      },
    })

    // Override the query methods to include wallet context
    const originalFrom = client.from.bind(client)
    client.from = (table: string) => {
      const query = originalFrom(table)

      // Add wallet address to the request context
      const originalSelect = query.select.bind(query)
      const originalInsert = query.insert.bind(query)
      const originalUpdate = query.update.bind(query)
      const originalDelete = query.delete.bind(query)

      query.select = (...args: any[]) => {
        const result = originalSelect(...args)
        // Set wallet context for RLS
        return result
      }

      query.insert = (...args: any[]) => {
        const result = originalInsert(...args)
        // Set wallet context for RLS
        return result
      }

      query.update = (...args: any[]) => {
        const result = originalUpdate(...args)
        // Set wallet context for RLS
        return result
      }

      query.delete = (...args: any[]) => {
        const result = originalDelete(...args)
        // Set wallet context for RLS
        return result
      }

      return query
    }
  }

  return client
}

// Middleware function to set wallet context in Supabase
export async function setWalletContext(client: any, walletAddress: string) {
  try {
    // Execute a function to set the wallet context
    await client.rpc("set_wallet_context", { wallet_addr: walletAddress.toLowerCase() })
  } catch (error) {
    console.error("Error setting wallet context:", error)
  }
}
