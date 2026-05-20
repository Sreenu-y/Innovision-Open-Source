"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Quote, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Learning is not attained by chance, it must be sought for with ardor and attended to with diligence.", author: "Abigail Adams" },
  { text: "The beautiful thing about learning is that nobody can take it away from you.", author: "B.B. King" },
  { text: "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.", author: "Malcolm X" },
  { text: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.", author: "Dr. Seuss" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The only limit to our realization of tomorrow is our doubts of today.", author: "Franklin D. Roosevelt" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Your limitation—it's only your imagination.", author: "Unknown" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Great things never come from comfort zones.", author: "Unknown" },
  { text: "Dream it. Wish it. Do it.", author: "Unknown" },
  { text: "Success doesn't just find you. You have to go out and get it.", author: "Unknown" },
  { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
  { text: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
  { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
  { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
  { text: "Little things make big days.", author: "Unknown" },
  { text: "It's going to be hard, but hard does not mean impossible.", author: "Unknown" },
  { text: "Don't wait for opportunity. Create it.", author: "Unknown" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "Knowledge is power. Information is liberating.", author: "Kofi Annan" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice.", author: "Brian Herbert" },
  { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
  { text: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch" },
];

export default function MotivationalQuote({ variant = "default" }) {
  const [quote, setQuote] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const getRandomQuote = () => {
    const randomIndex = Math.floor(Math.random() * QUOTES.length);
    return QUOTES[randomIndex];
  };

  const changeQuote = () => {
    setIsChanging(true);
    setIsVisible(false);

    setTimeout(() => {
      setQuote(getRandomQuote());
      setIsVisible(true);
      setIsChanging(false);
    }, 300);
  };

  useEffect(() => {
    // Get a random quote on mount
    setQuote(getRandomQuote());

    // Fade in after a short delay
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  if (!quote) return null;

  if (variant === "minimal") {
    return (
      <div
        className={`
          text-center py-4 transition-all duration-500 ease-out
          ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}
        `}
      >
        <p className="text-muted-foreground italic text-sm">
          "{quote.text}"
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          — {quote.author}
        </p>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={`
          flex items-center gap-3 p-3 rounded-lg bg-linear-to-r from-blue-500/10 to-purple-500/10 
          border border-blue-500/20 transition-all duration-500 ease-out
          ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}
        `}
      >
        <Sparkles className="h-5 w-5 text-blue-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate">"{quote.text}"</p>
          <p className="text-xs text-muted-foreground">— {quote.author}</p>
        </div>
      </div>
    );
  }

  return (
    <Card
      className={`
        relative overflow-hidden transition-all duration-700 ease-in-out border-white/10 dark:border-white/5
        bg-white/40 dark:bg-black/40 backdrop-blur-xl shadow-lg
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
      `}
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl -mr-16 -mt-16 rounded-full" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 blur-3xl -ml-16 -mb-16 rounded-full" />

      <div className="relative p-8">
        <div className="flex flex-col items-center text-center gap-6">
          <div className="p-3 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 shadow-xl shadow-blue-500/20 ring-4 ring-blue-500/10">
            <Quote className="h-6 w-6 text-white" />
          </div>

          <div className="space-y-4 max-w-2xl">
            <p className="text-xl md:text-2xl font-light tracking-tight leading-relaxed italic text-foreground/90">
              "{quote.text}"
            </p>
            <div className="flex flex-col items-center gap-4 pt-2">
              <div className="h-px w-12 bg-linear-to-r from-transparent via-border to-transparent" />
              <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground/80">
                {quote.author}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={changeQuote}
                disabled={isChanging}
                className="mt-2 rounded-full h-10 w-10 p-0 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/5 transition-all"
                aria-label="Refresh quote"
              >
                <RefreshCw className={`h-4 w-4 ${isChanging ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
