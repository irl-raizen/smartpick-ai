import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_POSTS } from "@/src/lib/posts";
import { Calendar, Clock, User, Sparkles, BookOpen, Compass, ChevronRight } from "lucide-react";

type Props = {
  params: Promise<{ slug: string }>;
};

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://smartpickai.vercel.app";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return {};

  return {
    title: `${post.title} | SmartPick AI`,
    description: post.excerpt,
    keywords: post.keywords,
    alternates: {
      canonical: `${baseUrl}/blog/${post.slug}`,
    },
    openGraph: {
      title: `${post.title} | SmartPick AI`,
      description: post.excerpt,
      url: `${baseUrl}/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishDate,
      authors: [post.author],
      images: [{ url: post.imageUrl }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | SmartPick AI`,
      description: post.excerpt,
      images: [post.imageUrl],
    }
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) {
    notFound();
  }

  // Schema JSON-LD for Search Engine Optimization
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${baseUrl}/blog/${post.slug}/#post`,
    "headline": post.title,
    "description": post.excerpt,
    "datePublished": post.publishDate,
    "dateModified": post.publishDate,
    "author": {
      "@type": "Person",
      "name": post.author
    },
    "image": post.imageUrl,
    "publisher": {
      "@type": "Organization",
      "name": "SmartPick AI",
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/favicon.ico`
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${baseUrl}/blog/${post.slug}`
    }
  };

  return (
    <div className="min-h-screen bg-zinc-955 text-zinc-100 overflow-x-hidden relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute top-0 left-1/2 h-[35rem] w-[45rem] -translate-x-1/2 rounded-full bg-radial-gradient from-violet-600/10 via-transparent to-transparent blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto max-w-4xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        
        {/* Navigation Breadcrumb */}
        <nav className="mb-8 flex items-center justify-between border-b border-zinc-900 pb-4">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-violet-350"
          >
            ← Back to Blog
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
            <span>Blog</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-zinc-300 truncate max-w-[150px]">{post.category}</span>
          </div>
        </nav>

        {/* Article Header */}
        <article className="space-y-8">
          <header className="space-y-4">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/25 text-xs font-bold text-violet-350 uppercase tracking-widest">
              {post.category}
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              {post.title}
            </h1>
            <p className="text-base sm:text-lg text-zinc-400 leading-relaxed font-semibold">
              {post.excerpt}
            </p>

            {/* Author and Date Meta block */}
            <div className="flex flex-wrap items-center gap-6 text-xs font-bold text-zinc-500 border-y border-zinc-900 py-4 mt-6">
              <span className="flex items-center gap-2">
                <User className="h-4 w-4 text-zinc-550" />
                <span>Written by:</span>
                <span className="text-zinc-300">{post.author}</span>
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-zinc-550" />
                <span>Published:</span>
                <span className="text-zinc-300">{post.publishDate}</span>
              </span>
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-zinc-550" />
                <span>Reading Time:</span>
                <span className="text-zinc-300">{post.readTime}</span>
              </span>
            </div>
          </header>

          {/* Featured Image */}
          <div className="relative h-64 sm:h-[400px] rounded-3xl overflow-hidden border border-zinc-900 bg-zinc-950/60 shadow-2xl">
            <img
              src={post.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>

          {/* Post Content rendering */}
          <div className="prose prose-invert prose-zinc max-w-none text-zinc-300 space-y-6 text-sm sm:text-base leading-relaxed font-medium">
            {post.content.split("\n\n").map((para, index) => {
              const trimmed = para.trim();
              if (!trimmed) return null;
              
              if (trimmed.startsWith("###")) {
                return (
                  <h3 key={index} className="text-xl sm:text-2xl font-black text-white tracking-tight pt-4">
                    {trimmed.replace("###", "").trim()}
                  </h3>
                );
              }
              if (trimmed.startsWith("*") || trimmed.startsWith("-")) {
                return (
                  <ul key={index} className="list-disc pl-6 space-y-2 text-zinc-400">
                    {trimmed.split("\n").map((li, lIdx) => (
                      <li key={lIdx}>{li.replace(/^[*-]\s*/, "").trim()}</li>
                    ))}
                  </ul>
                );
              }
              if (trimmed.startsWith("1.") || trimmed.startsWith("2.")) {
                return (
                  <ol key={index} className="list-decimal pl-6 space-y-2 text-zinc-450">
                    {trimmed.split("\n").map((li, lIdx) => (
                      <li key={lIdx}>{li.replace(/^\d+\.\s*/, "").trim()}</li>
                    ))}
                  </ol>
                );
              }
              return (
                <p key={index}>
                  {trimmed}
                </p>
              );
            })}
          </div>
        </article>

      </main>
    </div>
  );
}
