"use client";

import { useState } from "react";
import { Play, Tv, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VideoReviewsProps {
  model: string;
  brand: string;
}

export function VideoReviews({ model, brand }: VideoReviewsProps) {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  // High quality mockup tech reviewer videos
  const videos = [
    {
      id: "O-2V8vBcr0Y", // Sample high quality tech review
      title: `${brand} ${model} Review - The Honest Truth`,
      creator: "Marques Brownlee",
      avatar: "M",
      duration: "14:22",
      thumbnail: "https://images.unsplash.com/photo-1546054454-aa26e2b734c7?w=500&auto=format&fit=crop&q=60"
    },
    {
      id: "fVpe8oPZly0",
      title: `Unboxing the Ultimate ${model}!`,
      creator: "Unbox Therapy",
      avatar: "U",
      duration: "10:15",
      thumbnail: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&auto=format&fit=crop&q=60"
    },
    {
      id: "c6aU8F2mS0E",
      title: `${brand} ${model} One Month Later Review`,
      creator: "Dave2D",
      avatar: "D",
      duration: "08:45",
      thumbnail: "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=500&auto=format&fit=crop&q=60"
    }
  ];

  return (
    <div className="rounded-3xl border border-zinc-900 bg-zinc-900/30 p-8 backdrop-blur-md shadow-2xl relative">
      <div className="border-b border-zinc-850 pb-5 mb-6">
        <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
          <Tv className="h-5 w-5 text-rose-500" />
          Video Reviews & Hands-on
        </h2>
        <p className="text-xs text-zinc-500 mt-1">Watch video unboxings and in-depth specs breakdowns from tech experts.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {videos.map((vid, idx) => (
          <div 
            key={idx}
            className="group rounded-2xl bg-zinc-950/65 border border-zinc-900 overflow-hidden flex flex-col justify-between shadow-lg"
          >
            {/* Video Thumbnail */}
            <div className="relative aspect-video w-full bg-zinc-900 overflow-hidden">
              <img 
                src={vid.thumbnail}
                alt={vid.title}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-70"
              />
              
              {/* Play Button Overlay */}
              <button 
                onClick={() => setActiveVideo(vid.id)}
                className="absolute inset-0 m-auto h-12 w-12 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg shadow-rose-950/30 hover:bg-rose-500 hover:scale-110 active:scale-95 transition duration-300 z-10"
              >
                <Play className="h-5 w-5 fill-current ml-0.5" />
              </button>

              <div className="absolute bottom-2 right-2 bg-zinc-950/90 px-2 py-0.5 rounded text-[10px] font-bold text-zinc-300 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {vid.duration}
              </div>
            </div>

            {/* Meta details */}
            <div className="p-4 space-y-3">
              <h3 className="text-xs font-bold text-zinc-200 line-clamp-2 leading-relaxed">
                {vid.title}
              </h3>
              
              <div className="flex items-center justify-between text-[10px] text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-300">
                    {vid.avatar}
                  </span>
                  <span className="font-semibold text-zinc-400">{vid.creator}</span>
                </div>
                
                <span className="flex items-center gap-1 text-rose-500 font-semibold">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.524 3.545 12 3.545 12 3.545s-7.525 0-9.387.51A3.003 3.003 0 0 0 .502 6.163C0 8.07 0 12 0 12s0 3.93 .502 5.837a3.003 3.003 0 0 0 2.11 2.108c1.862.51 9.387.51 9.387.51s7.525 0 9.387-.51a3.003 3.003 0 0 0 2.11-2.108C24 15.93 24 12 24 12s0-3.93-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  YouTube
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Iframe Overlay */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveVideo(null)}
            className="fixed inset-0 bg-zinc-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative aspect-video w-full max-w-4xl bg-black rounded-3xl overflow-hidden border border-zinc-900 shadow-2xl cursor-default"
            >
              <iframe
                src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1`}
                title="YouTube Video Review"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
