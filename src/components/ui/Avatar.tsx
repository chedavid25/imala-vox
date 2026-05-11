"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

// URLs que ya fallaron en esta sesión — evita reintentar en cada remount
const failedUrlCache = new Set<string>();

interface AvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  onImageError?: () => void;
}

export function Avatar({ src, name, className, size = "md", onImageError }: AvatarProps) {
  const [error, setError] = useState(() => Boolean(src && failedUrlCache.has(src)));

  // Reset error only when src changes to a URL not in the cache
  useEffect(() => {
    setError(Boolean(src && failedUrlCache.has(src)));
  }, [src]);

  const handleError = () => {
    if (src) failedUrlCache.add(src);
    setError(true);
    onImageError?.();
  };

  const sizeClasses = {
    sm: "w-8 h-8 text-[10px]",
    md: "w-10 h-10 text-xs",
    lg: "w-11 h-11 text-sm",
    xl: "w-16 h-16 text-xl",
  };

  const initials = name
    ? name.trim().charAt(0).toUpperCase()
    : "?";

  return (
    <div className={cn(
      "flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden bg-[var(--accent)] border border-[var(--accent-hover)]/30 rounded-full",
      sizeClasses[size],
      className
    )}>
      {src && !error ? (
        <img
          src={src}
          alt={name || "avatar"}
          className="w-full h-full object-cover"
          onError={handleError}
        />
      ) : (
        <span className="font-black text-[var(--accent-text)]">
          {initials}
        </span>
      )}
    </div>
  );
}
