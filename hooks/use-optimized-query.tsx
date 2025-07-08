"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface QueryOptions<T> {
  queryKey: string
  queryFn: () => Promise<T>
  staleTime?: number
  cacheTime?: number
  enabled?: boolean
  refetchOnWindowFocus?: boolean
}

interface QueryResult<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  isStale: boolean
}

// Simple in-memory cache
const queryCache = new Map<string, { data: any; timestamp: number; staleTime: number }>()

export function useOptimizedQuery<T>({
  queryKey,
  queryFn,
  staleTime = 5 * 60 * 1000, // 5 minutes
  cacheTime = 10 * 60 * 1000, // 10 minutes
  enabled = true,
  refetchOnWindowFocus = false,
}: QueryOptions<T>): QueryResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isStale, setIsStale] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (!enabled) return

    // Check cache first
    const cached = queryCache.get(queryKey)
    const now = Date.now()

    if (cached && now - cached.timestamp < cached.staleTime) {
      setData(cached.data)
      setIsStale(false)
      return
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    setIsLoading(true)
    setError(null)

    try {
      const result = await queryFn()

      // Cache the result
      queryCache.set(queryKey, {
        data: result,
        timestamp: now,
        staleTime,
      })

      setData(result)
      setIsStale(false)
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err)
      }
    } finally {
      setIsLoading(false)
    }
  }, [queryKey, queryFn, enabled, staleTime])

  const refetch = useCallback(async () => {
    // Force refetch by removing from cache
    queryCache.delete(queryKey)
    await fetchData()
  }, [queryKey, fetchData])

  useEffect(() => {
    fetchData()

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchData])

  // Handle window focus refetch
  useEffect(() => {
    if (!refetchOnWindowFocus) return

    const handleFocus = () => {
      const cached = queryCache.get(queryKey)
      if (cached && Date.now() - cached.timestamp > staleTime) {
        setIsStale(true)
        fetchData()
      }
    }

    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [queryKey, staleTime, fetchData, refetchOnWindowFocus])

  // Cache cleanup
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now()
      for (const [key, value] of queryCache.entries()) {
        if (now - value.timestamp > cacheTime) {
          queryCache.delete(key)
        }
      }
    }

    const interval = setInterval(cleanup, 60000) // Cleanup every minute
    return () => clearInterval(interval)
  }, [cacheTime])

  return { data, isLoading, error, refetch, isStale }
}
