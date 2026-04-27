"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  animation?: "fade-in" | "fade-in-up" | "fade-in-left" | "fade-in-right" | "zoom-in";
  delay?: number;
  duration?: number;
  threshold?: number;
  once?: boolean;
}

/**
 * Componente para animar elementos cuando entran en el viewport (Scroll Reveal).
 * Usa IntersectionObserver para máxima performance.
 */
export function Reveal({
  children,
  className,
  animation = "fade-in-up",
  delay = 0,
  duration = 800,
  threshold = 0.1,
  once = true
}: RevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once && ref.current) observer.unobserve(ref.current);
        }
      },
      { threshold }
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, [once, threshold]);

  // Definición de estados iniciales y finales de animación
  const animationStyles = {
    "fade-in": isVisible ? "opacity-100" : "opacity-0",
    "fade-in-up": isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12",
    "fade-in-left": isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-12",
    "fade-in-right": isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12",
    "zoom-in": isVisible ? "opacity-100 scale-100" : "opacity-0 scale-90",
  };

  return (
    <div
      ref={ref}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
      className={cn(
        "transition-all ease-[cubic-bezier(0.21,0.47,0.32,0.98)]",
        animationStyles[animation],
        className
      )}
    >
      {children}
    </div>
  );
}
