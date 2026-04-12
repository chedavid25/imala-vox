import React from "react";
import { cn } from "@/lib/utils";
import { MessageCircle, Instagram, Facebook } from "lucide-react";

type CanalType = 'whatsapp' | 'instagram' | 'facebook';

interface CanalBadgeProps {
  canal: CanalType;
  className?: string;
  showIcon?: boolean;
}

export function CanalBadge({ canal, className, showIcon = true }: CanalBadgeProps) {
  const config = {
    whatsapp: {
      bg: "bg-[#052E16]",
      text: "text-[#22C55E]",
      icon: MessageCircle
    },
    instagram: {
      bg: "bg-[#2D1A0A]",
      text: "text-[#F97316]",
      icon: Instagram
    },
    facebook: {
      bg: "bg-[#0A1628]",
      text: "text-[#3B82F6]",
      icon: Facebook
    }
  };

  const Icon = config[canal].icon;

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-tight",
      config[canal].bg,
      config[canal].text,
      className
    )}>
      {showIcon && <Icon className="w-3 h-3" />}
      {canal}
    </span>
  );
}
