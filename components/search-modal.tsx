"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VerifiedBadge } from "@/components/verified-badge"
import { LazyImage } from "@/components/lazy-image"
import { supabase, type Course, type Lesson, type UserProfile } from "@/lib/supabase"
import { Search, X, BookOpen, Play, TrendingUp, History, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

type CourseWithCreatorProfile = Course & {
  lessons: Lesson[]
  creator_profile?: UserProfile | null
  relevanceScore?: number
}

type LessonWithCourse = Lesson & {
  course: Course & {
    creator_profile?: UserProfile | null
  }
  relevanceScore?: number
}

type SearchResult = {
  type: "course" | "lesson"
  data: CourseWithCreatorProfile | LessonWithCourse
  score: number
}

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

interface SearchSuggestion {
  text: string
  type: "recent" | "popular" | "suggestion"
  count?: number
}

// Fuzzy search utility
function fuzzyMatch(text: string, query: string): { score: number; matches: number[] } {
  const textLower = text.toLowerCase()
  const queryLower = query.toLowerCase()

  if (textLower.includes(queryLower)) {
    const index = textLower.indexOf(queryLower)
    return {
      score: 100 - index, // Higher score for earlier matches
      matches: Array.from({ length: query.length }, (_, i) => index + i),
    }
  }

  // Fuzzy matching for typos
  let score = 0
  const matches: number[] = []
  let queryIndex = 0

  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      matches.push(i)
      score += 10
      queryIndex++
    }
  }

  // Bonus for matching all characters
  if (queryIndex === queryLower.length) {
    score += 50
  }

  return { score, matches }
}

// Highlight search terms in text
function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text

  const { matches } = fuzzyMatch(text, query)
  if (matches.length === 0) return text

  const result: React.ReactNode[] = []
  let lastIndex = 0

  // Group consecutive matches
  const groups: { start: number; end: number }[] = []
  let currentGroup = { start: matches[0], end: matches[0] }

  for (let i = 1; i < matches.length; i++) {
    if (matches[i] === currentGroup.end + 1) {
      currentGroup.end = matches[i]
    } else {
      groups.push(currentGroup)
      currentGroup = { start: matches[i], end: matches[i] }
    }
  }
  groups.push(currentGroup)

  groups.forEach((group, index) => {
    // Add text before highlight
    if (group.start > lastIndex) {
      result.push(text.slice(lastIndex, group.start))
    }

    // Add highlighted text
    result.push(
      <mark
        key={index}
        className="bg-brand-secondary/20 dark:bg-brand-secondary/30 text-brand-primary dark:text-brand-secondary px-0.5 rounded"
      >
        {text.slice(group.start, group.end + 1)}
      </mark>,
    )

    lastIndex = group.end + 1
  })

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex))
  }

  return result
}

const RESULTS_PER_PAGE = 8
const POPULAR_SEARCHES = [
  "blockchain",
  "defi",
  "smart contracts",
  "web3",
  "cryptocurrency",
  "nft",
  "ethereum",
  "solidity",
  "trading",
  "dao",
  "introduction",
  "tutorial",
  "beginner",
  "advanced",
]

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [courseResults, setCourseResults] = useState<CourseWithCreatorProfile[]>([])
  const [lessonResults, setLessonResults] = useState<LessonWithCourse[]>([])
  const [allCourseResults, setAllCourseResults] = useState<CourseWithCreatorProfile[]>([])
  const [allLessonResults, setAllLessonResults] = useState<LessonWithCourse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [currentCoursePage, setCurrentCoursePage] = useState(1)
  const [currentLessonPage, setCurrentLessonPage] = useState(1)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1)
  const [activeTab, setActiveTab] = useState("all")

  // Use refs to prevent infinite loops
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSearchQueryRef = useRef("")
  const isSearchingRef = useRef(false)

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tutorial-recent-searches")
      if (saved) {
        try {
          setRecentSearches(JSON.parse(saved))
        } catch (error) {
          console.error("Error loading recent searches:", error)
        }
      }
    }
  }, [])

  // Generate suggestions based on query - memoized to prevent recreations
  const generateSuggestions = useCallback(
    (query: string): SearchSuggestion[] => {
      if (!query.trim()) return []

      const queryLower = query.toLowerCase()
      const suggestions: SearchSuggestion[] = []

      // Add recent searches that match
      recentSearches
        .filter((search) => search.toLowerCase().includes(queryLower))
        .slice(0, 3)
        .forEach((search) => {
          suggestions.push({ text: search, type: "recent" })
        })

      // Add popular searches that match
      POPULAR_SEARCHES.filter((search) => search.toLowerCase().includes(queryLower))
        .slice(0, 3)
        .forEach((search) => {
          if (!suggestions.some((s) => s.text === search)) {
            suggestions.push({ text: search, type: "popular" })
          }
        })

      // Add query completion suggestions
      if (query.length >= 2) {
        const completions = [`${query} tutorial`, `${query} course`, `${query} guide`, `learn ${query}`].filter(
          (completion) => !suggestions.some((s) => s.text === completion),
        )

        completions.slice(0, 2).forEach((completion) => {
          suggestions.push({ text: completion, type: "suggestion" })
        })
      }

      return suggestions.slice(0, 6)
    },
    [recentSearches],
  )

  // Update suggestions when query changes - memoized
  const updateSuggestions = useCallback(
    (query: string) => {
      const newSuggestions = generateSuggestions(query)
      setSuggestions(newSuggestions)
      setShowSuggestions(query.length > 0 && newSuggestions.length > 0)
      setSelectedSuggestion(-1)
    },
    [generateSuggestions],
  )

  // Save recent searches to localStorage - memoized
  const saveRecentSearch = useCallback((query: string) => {
    if (query.trim() && typeof window !== "undefined") {
      setRecentSearches((prev) => {
        const updated = [query, ...prev.filter((s) => s !== query)].slice(0, 8)
        localStorage.setItem("tutorial-recent-searches", JSON.stringify(updated))
        return updated
      })
    }
  }, [])

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([])
    if (typeof window !== "undefined") {
      localStorage.removeItem("tutorial-recent-searches")
    }
  }, [])

  // Enhanced search function with courses and lessons
  const performSearch = useCallback(
    async (query: string) => {
      // Prevent duplicate searches
      if (query === lastSearchQueryRef.current || isSearchingRef.current) {
        return
      }

      if (!query.trim()) {
        setAllCourseResults([])
        setAllLessonResults([])
        setCourseResults([])
        setLessonResults([])
        setCurrentCoursePage(1)
        setCurrentLessonPage(1)
        lastSearchQueryRef.current = ""
        return
      }

      lastSearchQueryRef.current = query
      isSearchingRef.current = true
      setIsLoading(true)

      try {
        const { data: courses, error: courseError } = await supabase
          .from("courses_sol")
          .select(`
          *,
          lessons_sol (*)
        `)
          .order("created_at", { ascending: false })

        if (courseError) throw courseError

        const { data: lessons, error: lessonError } = await supabase
          .from("lessons_sol")
          .select(`
          *,
          courses_sol (*)
        `)
          .order("order_index", { ascending: true })

        if (lessonError) throw lessonError

        const scoredCourses = (courses || [])
          .map((course) => {
            const titleMatch = fuzzyMatch(course.title, query)
            const descMatch = course.description ? fuzzyMatch(course.description, query) : { score: 0, matches: [] }

            // Calculate relevance score
            let relevanceScore = titleMatch.score * 2 + descMatch.score

            // Boost score for exact matches
            if (course.title.toLowerCase().includes(query.toLowerCase())) {
              relevanceScore += 100
            }

            // Boost score for verified creators
            relevanceScore += course.creator_wallet ? 10 : 0

            return {
              ...course,
              lessons: course.lessons_sol || [], // Map lessons_sol to lessons for compatibility
              relevanceScore,
            }
          })
          .filter((course) => course.relevanceScore > 0)

        const scoredLessons = (lessons || [])
          .map((lesson) => {
            const titleMatch = fuzzyMatch(lesson.title, query)
            const descMatch = lesson.description ? fuzzyMatch(lesson.description, query) : { score: 0, matches: [] }

            // Calculate relevance score - give lessons higher base scoring
            let relevanceScore = titleMatch.score * 2.5 + descMatch.score * 1.5

            // Boost score for exact matches in lesson titles (higher than courses)
            if (lesson.title.toLowerCase().includes(query.toLowerCase())) {
              relevanceScore += 120
            }

            // Boost for exact matches in lesson descriptions
            if (lesson.description && lesson.description.toLowerCase().includes(query.toLowerCase())) {
              relevanceScore += 60
            }

            // Additional boost for lessons to prioritize specific content
            relevanceScore += 15

            return {
              ...lesson,
              course: lesson.courses_sol, // Map courses_sol to course for compatibility
              relevanceScore,
            }
          })
          .filter((lesson) => lesson.relevanceScore > 0)

        // Sort by relevance score
        scoredCourses.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
        scoredLessons.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))

        const topCourses = scoredCourses.slice(0, 50)
        const coursesWithProfiles = await Promise.all(
          topCourses.map(async (course) => {
            try {
              const { data: profileData, error: profileError } = await supabase
                .from("user_profiles_sol")
                .select("*")
                .eq("wallet_address", course.creator_wallet.toLowerCase())
                .single()

              if (profileError && profileError.code !== "PGRST116") {
                console.error("Error fetching creator profile:", profileError)
              }

              return {
                ...course,
                creator_profile: profileData || null,
              }
            } catch (error) {
              return {
                ...course,
                creator_profile: null,
              }
            }
          }),
        )

        const topLessons = scoredLessons.slice(0, 50)
        const lessonsWithProfiles = await Promise.all(
          topLessons.map(async (lesson) => {
            try {
              const { data: profileData, error: profileError } = await supabase
                .from("user_profiles_sol")
                .select("*")
                .eq("wallet_address", lesson.course.creator_wallet.toLowerCase())
                .single()

              if (profileError && profileError.code !== "PGRST116") {
                console.error("Error fetching creator profile:", profileError)
              }

              return {
                ...lesson,
                course: {
                  ...lesson.course,
                  creator_profile: profileData || null,
                },
              }
            } catch (error) {
              return {
                ...lesson,
                course: {
                  ...lesson.course,
                  creator_profile: null,
                },
              }
            }
          }),
        )

        // Only update state if this is still the current search
        if (query === lastSearchQueryRef.current) {
          setAllCourseResults(coursesWithProfiles)
          setAllLessonResults(lessonsWithProfiles)
          setCourseResults(coursesWithProfiles.slice(0, RESULTS_PER_PAGE))
          setLessonResults(lessonsWithProfiles.slice(0, RESULTS_PER_PAGE))
          setCurrentCoursePage(1)
          setCurrentLessonPage(1)
          saveRecentSearch(query)
          setShowSuggestions(false)

          // Auto-switch to appropriate tab based on results
          if (coursesWithProfiles.length === 0 && lessonsWithProfiles.length > 0) {
            setActiveTab("lessons")
          } else if (coursesWithProfiles.length > 0 && lessonsWithProfiles.length === 0) {
            setActiveTab("courses")
          } else {
            setActiveTab("all")
          }
        }
      } catch (error) {
        console.error("Search error:", error)
        if (query === lastSearchQueryRef.current) {
          setAllCourseResults([])
          setAllLessonResults([])
          setCourseResults([])
          setLessonResults([])
        }
      } finally {
        isSearchingRef.current = false
        setIsLoading(false)
      }
    },
    [saveRecentSearch],
  )

  // Debounced search effect - fixed to prevent infinite loops
  useEffect(() => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Update suggestions immediately
    updateSuggestions(searchQuery)

    // Debounce the actual search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  // Handle pagination for courses
  const totalCoursePages = Math.ceil(allCourseResults.length / RESULTS_PER_PAGE)
  const handleCoursePageChange = useCallback(
    (page: number) => {
      const startIndex = (page - 1) * RESULTS_PER_PAGE
      const endIndex = startIndex + RESULTS_PER_PAGE
      setCourseResults(allCourseResults.slice(startIndex, endIndex))
      setCurrentCoursePage(page)
    },
    [allCourseResults],
  )

  // Handle pagination for lessons
  const totalLessonPages = Math.ceil(allLessonResults.length / RESULTS_PER_PAGE)
  const handleLessonPageChange = useCallback(
    (page: number) => {
      const startIndex = (page - 1) * RESULTS_PER_PAGE
      const endIndex = startIndex + RESULTS_PER_PAGE
      setLessonResults(allLessonResults.slice(startIndex, endIndex))
      setCurrentLessonPage(page)
    },
    [allLessonResults],
  )

  // Pagination component
  const PaginationControls = useCallback(
    ({
      currentPage,
      totalPages,
      onPageChange,
    }: { currentPage: number; totalPages: number; onPageChange: (page: number) => void }) => {
      if (totalPages <= 1) return null

      return (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} className="mr-1" />
              Previous
            </Button>

            {/* Page numbers */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        </div>
      )
    },
    [],
  )

  // Get video thumbnail
  const getVideoThumbnail = useCallback((youtubeUrl: string) => {
    const match = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    const videoId = match ? match[1] : null
    return videoId
      ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
      : "/placeholder.svg?height=120&width=160&text=Video"
  }, [])

  // Get first video thumbnail for course
  const getFirstVideoThumbnail = useCallback(
    (lessons: Lesson[]) => {
      if (lessons.length === 0) return "/placeholder.svg?height=120&width=160&text=No+Video"

      const firstLesson = lessons.sort((a, b) => a.order_index - b.order_index)[0]
      // Handle both youtube_url (old) and video_url (new) field names
      const videoUrl = firstLesson.video_url || firstLesson.youtube_url
      return videoUrl ? getVideoThumbnail(videoUrl) : "/placeholder.svg?height=120&width=160&text=Video"
    },
    [getVideoThumbnail],
  )

  // Get creator display name
  const getCreatorDisplayName = useCallback((creatorProfile: UserProfile | null | undefined, creatorWallet: string) => {
    if (creatorProfile?.display_name) {
      return creatorProfile.display_name
    }
    return `${creatorWallet.slice(0, 6)}...${creatorWallet.slice(-4)}`
  }, [])

  // Get creator avatar fallback
  const getCreatorAvatarFallback = useCallback(
    (creatorProfile: UserProfile | null | undefined, creatorWallet: string) => {
      if (creatorProfile?.display_name) {
        return creatorProfile.display_name.charAt(0).toUpperCase()
      }
      return creatorWallet.charAt(2).toUpperCase()
    },
    [],
  )

  // Handle course click
  const handleCourseClick = useCallback(() => {
    onClose()
  }, [onClose])

  // Handle lesson click
  const handleLessonClick = useCallback(() => {
    onClose()
  }, [onClose])

  // Handle suggestion selection
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setSearchQuery(suggestion)
    setShowSuggestions(false)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showSuggestions || suggestions.length === 0) return

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setSelectedSuggestion((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
          break
        case "ArrowUp":
          e.preventDefault()
          setSelectedSuggestion((prev) => (prev > 0 ? prev - 1 : -1))
          break
        case "Enter":
          e.preventDefault()
          if (selectedSuggestion >= 0) {
            handleSuggestionClick(suggestions[selectedSuggestion].text)
          }
          break
        case "Escape":
          setShowSuggestions(false)
          setSelectedSuggestion(-1)
          break
      }
    },
    [showSuggestions, suggestions, selectedSuggestion, handleSuggestionClick],
  )

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("")
      setCourseResults([])
      setLessonResults([])
      setAllCourseResults([])
      setAllLessonResults([])
      setShowSuggestions(false)
      setSelectedSuggestion(-1)
      setCurrentCoursePage(1)
      setCurrentLessonPage(1)
      setActiveTab("all")
      lastSearchQueryRef.current = ""
      isSearchingRef.current = false

      // Clear any pending search
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
        searchTimeoutRef.current = null
      }
    }
  }, [isOpen])

  // Calculate total results
  const totalResults = allCourseResults.length + allLessonResults.length

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="text-xl font-semibold">Search Courses & Lessons</DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="p-6 pb-4 relative">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search for courses, lessons, topics, or creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-4 h-12 text-base"
              autoFocus
              autoComplete="off"
              role="combobox"
              aria-expanded={showSuggestions}
              aria-haspopup="listbox"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setShowSuggestions(false)
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                aria-label="Clear search"
              >
                <X size={16} />
              </Button>
            )}
          </div>

          {/* Search Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-6 right-6 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  className={`w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-center gap-3 ${
                    selectedSuggestion === index ? "bg-accent" : ""
                  }`}
                  role="option"
                  aria-selected={selectedSuggestion === index}
                >
                  {suggestion.type === "recent" && <History size={16} className="text-muted-foreground" />}
                  {suggestion.type === "popular" && <TrendingUp size={16} className="text-muted-foreground" />}
                  {suggestion.type === "suggestion" && <Search size={16} className="text-muted-foreground" />}
                  <span className="text-sm">{suggestion.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto p-6 pt-0 min-h-0">
          {!searchQuery.trim() && recentSearches.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-muted-foreground">Recent Searches</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearRecentSearches}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((query, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setSearchQuery(query)}
                  >
                    <History size={12} className="mr-1" />
                    {query}
                  </Badge>
                ))}
              </div>
              <Separator className="mt-6" />
              <div className="mt-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Popular Searches</h3>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SEARCHES.slice(0, 8).map((query, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => setSearchQuery(query)}
                    >
                      <TrendingUp size={12} className="mr-1" />
                      {query}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-primary"></div>
                Searching courses and lessons...
              </div>
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-40 h-24 bg-muted rounded"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-muted rounded w-3/4"></div>
                        <div className="h-4 bg-muted rounded w-full"></div>
                        <div className="h-4 bg-muted rounded w-2/3"></div>
                        <div className="h-3 bg-muted rounded w-1/3"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {searchQuery.trim() && !isLoading && totalResults === 0 && (
            <div className="text-center py-12">
              <Search size={48} className="text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No results found</h3>
              <p className="text-muted-foreground mb-4">Try searching with different keywords or check your spelling</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Link href="/courses" onClick={handleCourseClick}>
                  <Button variant="outline">
                    <BookOpen size={16} className="mr-2" />
                    Browse All Courses
                  </Button>
                </Link>
                <Button variant="ghost" onClick={() => setSearchQuery("")}>
                  Clear Search
                </Button>
              </div>
            </div>
          )}

          {totalResults > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Found {totalResults} result{totalResults !== 1 ? "s" : ""} for "{searchQuery}"
                  {allCourseResults.length > 0 && allLessonResults.length > 0 && (
                    <span className="ml-2">
                      ({allCourseResults.length} course{allCourseResults.length !== 1 ? "s" : ""},{" "}
                      {allLessonResults.length} lesson{allLessonResults.length !== 1 ? "s" : ""})
                    </span>
                  )}
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">All ({totalResults})</TabsTrigger>
                  <TabsTrigger value="courses">Courses ({allCourseResults.length})</TabsTrigger>
                  <TabsTrigger value="lessons">Lessons ({allLessonResults.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4 mt-4">
                  {(() => {
                    // Combine and sort all results by relevance score
                    const combinedResults = [
                      ...courseResults
                        .slice(0, 6)
                        .map((course) => ({ type: "course", data: course, score: course.relevanceScore || 0 })),
                      ...lessonResults
                        .slice(0, 6)
                        .map((lesson) => ({ type: "lesson", data: lesson, score: lesson.relevanceScore || 0 })),
                    ]
                      .sort((a, b) => b.score - a.score)
                      .slice(0, 6)

                    return combinedResults.map((result, index) => {
                      if (result.type === "course") {
                        const course = result.data
                        return (
                          <Link key={`course-${course.id}`} href={`/courses/${course.id}`} onClick={handleCourseClick}>
                            <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group">
                              <CardContent className="p-4">
                                <div className="flex gap-4">
                                  <div className="relative w-40 h-24 flex-shrink-0 rounded overflow-hidden">
                                    <LazyImage
                                      src={getFirstVideoThumbnail(course.lessons)}
                                      alt={course.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Play size={24} className="text-white" fill="white" />
                                    </div>
                                    <Badge variant="secondary" className="absolute top-1 right-1 text-xs">
                                      Course
                                    </Badge>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-foreground mb-2 line-clamp-2 leading-tight group-hover:text-brand-primary transition-colors">
                                      {highlightText(course.title, searchQuery)}
                                    </h3>
                                    {course.description && (
                                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                        {highlightText(course.description, searchQuery)}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-2 mb-3">
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage
                                          src={course.creator_profile?.avatar_url || "/placeholder.svg"}
                                          alt="Creator"
                                        />
                                        <AvatarFallback className="text-xs bg-muted font-medium text-muted-foreground">
                                          {getCreatorAvatarFallback(course.creator_profile, course.creator_wallet)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-sm font-medium text-foreground">
                                        {getCreatorDisplayName(course.creator_profile, course.creator_wallet)}
                                      </span>
                                      {course.creator_profile?.is_verified && (
                                        <VerifiedBadge isVerified={true} size="sm" />
                                      )}
                                      <span className="text-sm font-medium text-muted-foreground ml-2">
                                        {course.lessons.length} lessons
                                      </span>
                                      <span className="text-sm font-medium text-muted-foreground ml-2">
                                        {new Date(course.created_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        )
                      } else {
                        const lesson = result.data
                        return (
                          <Link
                            key={`lesson-${lesson.id}`}
                            href={`/courses/${lesson.course.id}/lessons/${lesson.id}`}
                            onClick={handleLessonClick}
                          >
                            <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group">
                              <CardContent className="p-4">
                                <div className="flex gap-4">
                                  <div className="relative w-40 h-24 flex-shrink-0 rounded overflow-hidden">
                                    <LazyImage
                                      src={getFirstVideoThumbnail([lesson])}
                                      alt={lesson.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Play size={24} className="text-white" fill="white" />
                                    </div>
                                    <Badge variant="secondary" className="absolute top-1 right-1 text-xs">
                                      Lesson
                                    </Badge>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-foreground mb-2 line-clamp-2 leading-tight group-hover:text-brand-primary transition-colors">
                                      {highlightText(lesson.title, searchQuery)}
                                    </h3>
                                    {lesson.description && (
                                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                        {highlightText(lesson.description, searchQuery)}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-2 mb-3">
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage
                                          src={lesson.course.creator_profile?.avatar_url || "/placeholder.svg"}
                                          alt="Creator"
                                        />
                                        <AvatarFallback className="text-xs bg-muted font-medium text-muted-foreground">
                                          {getCreatorAvatarFallback(
                                            lesson.course.creator_profile,
                                            lesson.course.creator_wallet,
                                          )}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-sm font-medium text-foreground">
                                        {getCreatorDisplayName(
                                          lesson.course.creator_profile,
                                          lesson.course.creator_wallet,
                                        )}
                                      </span>
                                      {lesson.course.creator_profile?.is_verified && (
                                        <VerifiedBadge isVerified={true} size="sm" />
                                      )}
                                      <span className="text-sm font-medium text-muted-foreground ml-2">
                                        Lesson {lesson.order_index + 1}
                                      </span>
                                      <span className="text-sm font-medium text-muted-foreground ml-2">
                                        {new Date(lesson.created_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        )
                      }
                    })
                  })()}

                  {(allCourseResults.length > 6 || allLessonResults.length > 6) && (
                    <div className="text-center text-sm text-muted-foreground">
                      Use the tabs above to see all courses and lessons
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="courses" className="space-y-4 mt-4">
                  {courseResults.map((course) => (
                    <Link key={`course-${course.id}`} href={`/courses/${course.id}`} onClick={handleCourseClick}>
                      <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group">
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            <div className="relative w-40 h-24 flex-shrink-0 rounded overflow-hidden">
                              <LazyImage
                                src={getFirstVideoThumbnail(course.lessons)}
                                alt={course.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play size={24} className="text-white" fill="white" />
                              </div>
                              <Badge variant="secondary" className="absolute top-1 right-1 text-xs">
                                Course
                              </Badge>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-foreground mb-2 line-clamp-2 leading-tight group-hover:text-brand-primary transition-colors">
                                {highlightText(course.title, searchQuery)}
                              </h3>
                              {course.description && (
                                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                  {highlightText(course.description, searchQuery)}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mb-3">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage
                                    src={course.creator_profile?.avatar_url || "/placeholder.svg"}
                                    alt="Creator"
                                  />
                                  <AvatarFallback className="text-xs bg-muted font-medium text-muted-foreground">
                                    {getCreatorAvatarFallback(course.creator_profile, course.creator_wallet)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium text-foreground">
                                  {getCreatorDisplayName(course.creator_profile, course.creator_wallet)}
                                </span>
                                {course.creator_profile?.is_verified && <VerifiedBadge isVerified={true} size="sm" />}
                                <span className="text-sm font-medium text-muted-foreground ml-2">
                                  {course.lessons.length} lessons
                                </span>
                                <span className="text-sm font-medium text-muted-foreground ml-2">
                                  {new Date(course.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                  {totalCoursePages > 1 && (
                    <PaginationControls
                      currentPage={currentCoursePage}
                      totalPages={totalCoursePages}
                      onPageChange={handleCoursePageChange}
                    />
                  )}
                </TabsContent>

                <TabsContent value="lessons" className="space-y-4 mt-4">
                  {lessonResults.map((lesson) => (
                    <Link
                      key={`lesson-${lesson.id}`}
                      href={`/courses/${lesson.course.id}/lessons/${lesson.id}`}
                      onClick={handleLessonClick}
                    >
                      <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group">
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            <div className="relative w-40 h-24 flex-shrink-0 rounded overflow-hidden">
                              <LazyImage
                                src={getFirstVideoThumbnail([lesson])}
                                alt={lesson.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play size={24} className="text-white" fill="white" />
                              </div>
                              <Badge variant="secondary" className="absolute top-1 right-1 text-xs">
                                Lesson
                              </Badge>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-foreground mb-2 line-clamp-2 leading-tight group-hover:text-brand-primary transition-colors">
                                {highlightText(lesson.title, searchQuery)}
                              </h3>
                              {lesson.description && (
                                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                  {highlightText(lesson.description, searchQuery)}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mb-3">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage
                                    src={lesson.course.creator_profile?.avatar_url || "/placeholder.svg"}
                                    alt="Creator"
                                  />
                                  <AvatarFallback className="text-xs bg-muted font-medium text-muted-foreground">
                                    {getCreatorAvatarFallback(
                                      lesson.course.creator_profile,
                                      lesson.course.creator_wallet,
                                    )}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium text-foreground">
                                  {getCreatorDisplayName(lesson.course.creator_profile, lesson.course.creator_wallet)}
                                </span>
                                {lesson.course.creator_profile?.is_verified && (
                                  <VerifiedBadge isVerified={true} size="sm" />
                                )}
                                <span className="text-sm font-medium text-muted-foreground ml-2">
                                  Lesson {lesson.order_index + 1}
                                </span>
                                <span className="text-sm font-medium text-muted-foreground ml-2">
                                  {new Date(lesson.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                  {totalLessonPages > 1 && (
                    <PaginationControls
                      currentPage={currentLessonPage}
                      totalPages={totalLessonPages}
                      onPageChange={handleLessonPageChange}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
