"use client";

import { useState, FormEvent } from "react";
import { Send } from "lucide-react";

export function HomeNewsletterForm() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
    }
  };

  return (
    <div className="w-full md:max-w-md">
      {subscribed ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-xs font-bold text-emerald-300 text-center backdrop-blur-sm">
          🎉 Subscribed successfully! You'll receive our weekly price cut digest.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-violet-500 transition duration-300"
          />
          <button
            type="submit"
            className="rounded-2xl bg-violet-600 hover:bg-violet-550 px-6 py-3.5 text-xs font-black text-white flex items-center justify-center gap-1.5 transition duration-300 hover:shadow-lg hover:shadow-violet-900/20 shrink-0"
          >
            Subscribe
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      )}
    </div>
  );
}
