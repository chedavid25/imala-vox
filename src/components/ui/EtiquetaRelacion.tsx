import React from "react";
import { cn } from "@/lib/utils";

type RelacionType = 'Personal' | 'Laboral' | 'Lead';

interface EtiquetaRelacionProps {
  tipo: RelacionType;
  className?: string;
}

export function EtiquetaRelacion({ tipo, className }: EtiquetaRelacionProps) {
  const config = {
    Personal: "bg-[#2A2A28] text-[#8A8A85]",
    Lead: "bg-[#0F172A] text-[#3B82F6]",
    Laboral: "bg-[#0F172A] text-[#22C55E]",
  };

  return (
    <span className={cn(
      "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider",
      config[tipo],
      className
    )}>
      {tipo}
    </span>
  );
}
