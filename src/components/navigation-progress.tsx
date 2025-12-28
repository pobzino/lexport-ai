"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Reset on route change complete
    setIsNavigating(false);
    setProgress(100);

    const timeout = setTimeout(() => setProgress(0), 200);
    return () => clearTimeout(timeout);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (isNavigating) {
      // Simulate progress
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isNavigating]);

  // Listen for navigation start via click events on links
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");

      if (anchor && anchor.href && !anchor.target && !anchor.download) {
        const url = new URL(anchor.href);
        if (url.origin === window.location.origin && url.pathname !== pathname) {
          setIsNavigating(true);
          setProgress(20);
        }
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  if (progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transition: progress === 100 ? "opacity 200ms, width 200ms" : "width 200ms"
        }}
      />
    </div>
  );
}

// Full page loader for initial loads and auth
export function PageLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-slate-200 rounded-full" />
          <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 rounded-full border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-slate-600 font-medium">{message}</p>
      </div>
    </div>
  );
}

// Inline spinner for buttons
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin h-4 w-4 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
