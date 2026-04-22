"use client";

import React, { useEffect } from "react";

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
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

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
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1.5 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="px-6 py-4 border-b border-slate-100 shrink-0">
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}
