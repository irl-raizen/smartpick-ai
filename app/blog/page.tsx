import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_POSTS } from "@/src/lib/posts";
import { BookOpen, Calendar, Clock, User, ArrowRight, Compass, Camera, Gamepad2, BatteryCharging, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Expert Buying Guides & Smartphone Insights | SmartPick AI",
  description: "Read detailed, data-backed buying guides and hardware insights for camera, gaming, and battery performance in modern smartphones.",
  alternates: {
    canonical: "https://smartpickai.vercel.app/blog",
  }
};

export default function BlogIndexPage() {
  const categories = [
    { name: "All Articles", slug: "all", icon: Compass },
    { name: "Camera Guides", slug: "camera", icon: Camera },
    { name: "Gaming Hardware", slug: "gaming", icon: Gamepad2 },
    { name: "Battery & Charging", slug: "battery", icon: BatteryCharging },
  ];

  return (
    <div className="min-h-screen bg-zinc-955 text-zinc-100 overflow-x-hidden relative">
      {/* Glow Backdrops */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute top-0 left-1/2 h-[30rem] w-[40rem] -translate-x-1/2 rounded-full bg-radial-gradient from-violet-600/10 via-transparent to-transparent blur-3xl" />
        <div className="absolute bottom-1/3 left-0 h-[25rem] w-[25rem] rounded-full bg-fuchsia-600/5 blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        
        {/* Navigation Breadcrumb */}
        <nav className="mb-8 flex items-center justify-between border-b border-zinc-900 pb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-violet-350"
          >
            ← Back to Home
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
            <span>Resources</span>
            <span>/</span>
            <span className="text-zinc-300">Blog Guides</span>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-4.5 py-1.5 text-xs font-bold text-violet-350 uppercase tracking-widest">
            <BookOpen className="h-3.5 w-3.5" />
            SmartPick Insights
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
            Expert Smartphone Guides
          </h1>
          <p className="text-sm sm:text-base text-zinc-450 leading-relaxed font-medium">
            Read our data-driven hardware analyses, camera sensor breakdowns, and deep gaming benchmarks.
          </p>
        </section>

        {/* Featured Post */}
        {BLOG_POSTS.length > 0 && (
          <section className="mb-16">
            <div className="rounded-3xl border border-zinc-900 bg-zinc-900/10 backdrop-blur-sm overflow-hidden grid lg:grid-cols-2 gap-8 p-6 sm:p-8">
              <div className="relative h-64 lg:h-full rounded-2xl overflow-hidden border border-zinc-850">
                <img
                  src={BLOG_POSTS[0].imageUrl}
                  alt={BLOG_POSTS[0].title}
                  className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
                />
              </div>
              <div className="flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 border border-violet-500/25 px-3 py-1 text-xs font-bold text-violet-300 uppercase tracking-wider">
                    <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                    Featured Article
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                    {BLOG_POSTS[0].title}
                  </h2>
                  <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                    {BLOG_POSTS[0].excerpt}
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Meta items */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-zinc-500 border-t border-zinc-900 pt-4">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-zinc-550" />
                      {BLOG_POSTS[0].author}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-zinc-550" />
                      {BLOG_POSTS[0].publishDate}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-zinc-550" />
                      {BLOG_POSTS[0].readTime}
                    </span>
                  </div>

                  <Link
                    href={`/blog/${BLOG_POSTS[0].slug}`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 hover:bg-violet-550 px-6 py-3.5 text-xs font-black text-white shadow-lg transition"
                  >
                    Read Full Guide
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Category Filter pills */}
        <section className="mb-10 flex flex-wrap items-center gap-3">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.slug}
                className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-2xl text-xs font-bold transition border border-zinc-900 bg-zinc-950/40 text-zinc-400 hover:border-zinc-800 hover:text-white"
              >
                <Icon className="h-4 w-4 text-violet-400/80" />
                {cat.name}
              </button>
            );
          })}
        </section>

        {/* Blog Post Cards Grid */}
        <section className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {BLOG_POSTS.slice(1).map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group rounded-3xl border border-zinc-900 bg-zinc-900/15 p-5 backdrop-blur-sm hover:border-zinc-800 transition duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="relative h-44 rounded-2xl overflow-hidden border border-zinc-900 bg-zinc-950">
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    className="h-full w-full object-cover group-hover:scale-[1.03] transition duration-500"
                  />
                  <span className="absolute top-3 left-3 rounded-full bg-zinc-950/80 border border-zinc-900/50 backdrop-blur-md px-3 py-1 text-[9px] font-black uppercase tracking-wider text-violet-400">
                    {post.category}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-black text-white group-hover:text-violet-200 transition-colors leading-tight">
                    {post.title}
                  </h3>
                  <p className="text-xs text-zinc-450 line-clamp-2 leading-relaxed">
                    {post.excerpt}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-zinc-900/80 pt-4 mt-5 text-[10px] font-bold text-zinc-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-zinc-550" />
                  {post.publishDate}
                </span>
                <span className="text-violet-400 group-hover:translate-x-1 transition duration-200 flex items-center gap-1 font-extrabold uppercase tracking-wider text-[9px]">
                  Read Guide →
                </span>
              </div>
            </Link>
          ))}
        </section>

      </main>
    </div>
  );
}
