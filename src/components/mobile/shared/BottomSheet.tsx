"use client";

import React, { useEffect, useRef, useState } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  maxHeight?: string;
}

export function BottomSheet({
  open,
  onClose,
  children,
  title,
  maxHeight = "80vh",
}: BottomSheetProps) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Reset drag state when sheet opens/closes
  useEffect(() => {
    if (!open) {
      setDragY(0);
      setIsDragging(false);
    }
  }, [open]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    startTimeRef.current = Date.now();
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0) setDragY(delta);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    const elapsed = Math.max(Date.now() - startTimeRef.current, 1);
    const velocity = dragY / elapsed; // px/ms

    if (dragY > 80 || velocity > 0.5) {
      onClose();
    } else {
      setDragY(0);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end animate-in fade-in duration-200">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative bg-white rounded-t-[24px] shadow-2xl flex flex-col animate-in slide-in-from-bottom-full duration-300"
        style={{
          maxHeight,
          paddingBottom: "env(safe-area-inset-bottom)",
          transform: `translateY(${dragY}px)`,
          transition: isDragging ? "none" : "transform 0.25s ease",
          willChange: "transform",
        }}
      >
        {/* Área de arrastre — handle + header */}
        <div
          className="shrink-0 cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Handle pill */}
          <div className="flex justify-center pt-3 pb-1">
            <div
              className="w-10 h-1.5 rounded-full transition-colors"
              style={{ backgroundColor: isDragging ? "#94a3b8" : "#e2e8f0" }}
            />
          </div>

          {/* Header */}
          {title && (
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}
