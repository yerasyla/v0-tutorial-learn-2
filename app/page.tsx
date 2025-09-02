import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { OptimizedFeaturedCourses } from "@/components/optimized-featured-courses"

const BookOpen = ({ size = 24, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className}
  >
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
)

const Users = ({ size = 24, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className}
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const Coins = ({ size = 24, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className}
  >
    <circle cx="8" cy="8" r="6" />
    <path d="M18.09 10.37A6 6 0 1 1 10.37 18.09" />
    <path d="M7 6h1v4" />
    <path d="M16.71 13.88L18.09 15.26" />
  </svg>
)

const ArrowRight = ({ size = 24, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className}
  >
    <path d="M5 12h14" />
    <path d="M12 5l7 7-7 7" />
  </svg>
)

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-background py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Build the future of <span className="text-brand-primary">Solana</span> and Web3
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-4xl mx-auto leading-relaxed">
              Learn, Build, and Support creators on Solana
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/courses">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-brand-primary hover:bg-brand-secondary text-primary-foreground font-semibold px-8 py-4 text-lg h-14"
                >
                  Browse Courses
                </Button>
              </Link>
              <Link href="/create-course">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-primary-foreground bg-transparent px-8 py-4 text-lg h-14"
                >
                  Create Course
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Courses Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-12 gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center mb-4">
                <BookOpen size={28} className="text-brand-primary mr-3" />
                <span className="text-brand-primary font-semibold text-lg">Library of Solana and Web3 Tutorials</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground leading-tight">Find the course for you</h2>
            </div>
            <Link href="/courses">
              <Button
                variant="outline"
                className="border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-primary-foreground bg-transparent px-6 py-3 text-base font-semibold h-12"
              >
                Browse all
                <ArrowRight size={18} className="ml-2" />
              </Button>
            </Link>
          </div>

          <OptimizedFeaturedCourses />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
              Join the Solana Education Revolution
            </h2>
            <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              Create and discover educational content while supporting creators with SOL on Solana
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-card border-2 border-border hover:border-brand-primary transition-all duration-300 group">
              <CardHeader className="pb-6 pt-8 px-8">
                <div className="mb-6">
                  <BookOpen
                    size={56}
                    className="text-brand-primary group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <CardTitle className="text-card-foreground text-2xl mb-4 leading-tight">Create Courses</CardTitle>
                <CardDescription className="text-muted-foreground text-base leading-relaxed">
                  Share your knowledge by creating courses with YouTube videos
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <p className="text-muted-foreground leading-relaxed">
                  Connect your Solana wallet and start creating educational content for the Web3 community.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-2 border-border hover:border-brand-primary transition-all duration-300 group">
              <CardHeader className="pb-6 pt-8 px-8">
                <div className="mb-6">
                  <Users
                    size={56}
                    className="text-brand-primary group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <CardTitle className="text-card-foreground text-2xl mb-4 leading-tight">Learn Together</CardTitle>
                <CardDescription className="text-muted-foreground text-base leading-relaxed">
                  Access quality educational content from verified creators
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <p className="text-muted-foreground leading-relaxed">
                  Discover courses on Solana, DeFi, NFTs, and more from experienced educators.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-2 border-border hover:border-brand-primary transition-all duration-300 group">
              <CardHeader className="pb-6 pt-8 px-8">
                <div className="mb-6">
                  <Coins
                    size={56}
                    className="text-brand-primary group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <CardTitle className="text-card-foreground text-2xl mb-4 leading-tight">Support Creators</CardTitle>
                <CardDescription className="text-muted-foreground text-base leading-relaxed">
                  Donate SOL to show appreciation for great content
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <p className="text-muted-foreground leading-relaxed">
                  Use SOL on Solana to directly support your favorite educators.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
