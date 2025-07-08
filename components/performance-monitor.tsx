"use client"

import { useEffect } from "react"

interface PerformanceMetrics {
  name: string
  value: number
  rating: "good" | "needs-improvement" | "poor"
}

export function PerformanceMonitor() {
  useEffect(() => {
    if (typeof window === "undefined" || !("performance" in window)) return

    const observer = new PerformanceObserver((list) => {
      const metrics: PerformanceMetrics[] = []

      for (const entry of list.getEntries()) {
        if (entry.entryType === "navigation") {
          const navEntry = entry as PerformanceNavigationTiming

          // First Contentful Paint
          const fcp = navEntry.responseEnd - navEntry.fetchStart
          metrics.push({
            name: "First Contentful Paint",
            value: fcp,
            rating: fcp < 1800 ? "good" : fcp < 3000 ? "needs-improvement" : "poor",
          })

          // Largest Contentful Paint
          const lcp = navEntry.loadEventEnd - navEntry.fetchStart
          metrics.push({
            name: "Largest Contentful Paint",
            value: lcp,
            rating: lcp < 2500 ? "good" : lcp < 4000 ? "needs-improvement" : "poor",
          })

          // Time to Interactive
          const tti = navEntry.domInteractive - navEntry.fetchStart
          metrics.push({
            name: "Time to Interactive",
            value: tti,
            rating: tti < 3800 ? "good" : tti < 7300 ? "needs-improvement" : "poor",
          })
        }

        if (entry.entryType === "measure") {
          metrics.push({
            name: entry.name,
            value: entry.duration,
            rating: entry.duration < 100 ? "good" : entry.duration < 300 ? "needs-improvement" : "poor",
          })
        }
      }

      // Log performance metrics in development
      if (process.env.NODE_ENV === "development" && metrics.length > 0) {
        console.group("🚀 Performance Metrics")
        metrics.forEach((metric) => {
          const emoji = metric.rating === "good" ? "✅" : metric.rating === "needs-improvement" ? "⚠️" : "❌"
          console.log(`${emoji} ${metric.name}: ${metric.value.toFixed(2)}ms (${metric.rating})`)
        })
        console.groupEnd()
      }
    })

    observer.observe({ entryTypes: ["navigation", "measure"] })

    // Measure component render times
    const measureRender = (componentName: string) => {
      performance.mark(`${componentName}-start`)

      return () => {
        performance.mark(`${componentName}-end`)
        performance.measure(`${componentName}-render`, `${componentName}-start`, `${componentName}-end`)
      }
    }

    // Cleanup
    return () => {
      observer.disconnect()
    }
  }, [])

  return null
}
