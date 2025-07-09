import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Users, Coins, ArrowRight } from "@phosphor-icons/react/dist/ssr"
import { OptimizedFeaturedCourses } from "@/components/optimized-featured-courses"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-background py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Build the future of <span className="text-brand-primary">Web3</span> and AI 
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-4xl mx-auto leading-relaxed">
              Learn, Build, and Support creators
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
                <span className="text-brand-primary font-semibold text-lg">Library of Web3 and AI Tutorials</span>
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
              Join the Web3 Education Revolution
            </h2>
            <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              Create and discover educational content while supporting creators with TUT tokens on BNB Chain
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
                  Connect your wallet and start creating educational content for the Web3 community.
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
                  Discover courses on blockchain, DeFi, NFTs, and more from experienced educators.
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
                  Donate TUT tokens to show appreciation for great content
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <p className="text-muted-foreground leading-relaxed">
                  Use TUT tokens on BNB Chain to directly support your favorite educators.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
