"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

interface AvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Avatar({ src, name, className, size = "md" }: AvatarProps) {
  const [error, setError] = useState(false);

  // Reset error when src changes
  useEffect(() => {
    setError(false);
  }, [src]);

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
          onError={() => setError(true)}
        />
      ) : (
        <span className="font-black text-[var(--accent-text)]">
          {initials}
        </span>
      )}
    </div>
  );
}
