"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import { OptimizedPaginatedCourses } from "@/components/optimized-paginated-courses"

export default function CoursesPage() {
  const [tablesExist, setTablesExist] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkTablesExist()
  }, [])

  const checkTablesExist = async () => {
    try {
      const { error } = await supabase.from("courses_sol").select("id", { head: true, limit: 1 })

      if (error && error.code === "PGRST116") {
        setTablesExist(false)
      }
    } catch (error) {
      console.error("Error checking tables:", error)
      setTablesExist(false)
    } finally {
      setIsLoading(false)
    }
  }

  if (!tablesExist) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Alert className="border-2 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-orange-600 dark:text-orange-400"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <AlertDescription className="text-orange-800 dark:text-orange-200 text-base leading-relaxed ml-2">
              Database tables need to be created. Please run the SQL script in your Supabase dashboard to set up the
              database.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <div className="h-10 bg-muted rounded w-1/3 mb-4 animate-pulse"></div>
            <div className="h-6 bg-muted rounded w-1/2 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {[...Array(15)].map((_, i) => (
              <Card key={i} className="animate-pulse overflow-hidden bg-card border-border h-full">
                <div className="aspect-video bg-muted"></div>
                <div className="p-4">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2 mb-3"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4 leading-tight">All Courses</h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
            Discover educational content from Web3 creators and expand your knowledge
          </p>
        </div>

        <OptimizedPaginatedCourses pageSize={15} />
      </div>
    </div>
  )
}
