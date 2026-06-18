function PhoneCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="h-4 w-20 rounded-full bg-zinc-800" />
          <div className="h-6 w-36 rounded-full bg-zinc-800" />
        </div>
        <div className="h-7 w-20 rounded-full bg-zinc-800" />
      </div>
      <div className="space-y-3 border-t border-zinc-800 pt-3">
        <div className="flex justify-between gap-4">
          <div className="h-4 w-16 rounded-full bg-zinc-800" />
          <div className="h-4 w-28 rounded-full bg-zinc-800" />
        </div>
        <div className="flex justify-between gap-4 border-t border-zinc-800 pt-3">
          <div className="h-4 w-16 rounded-full bg-zinc-800" />
          <div className="h-4 w-20 rounded-full bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}

export default function PhonesLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
      </div>

      <main className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pt-24">
        <section className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-6 h-8 w-28 animate-pulse rounded-full bg-zinc-800" />
          <div className="mx-auto h-12 w-80 max-w-full animate-pulse rounded-full bg-zinc-800" />
          <div className="mx-auto mt-6 h-6 w-96 max-w-full animate-pulse rounded-full bg-zinc-800" />
        </section>

        <section className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <PhoneCardSkeleton key={index} />
          ))}
        </section>
      </main>
    </div>
  );
}
