import React from "react";
import { cn } from "@/lib/utils";

type IAStatus = 'activo' | 'pausado' | 'bloqueado' | 'fuera_horario';

interface IndicadorIAProps {
  status: IAStatus;
  className?: string;
}

export function IndicadorIA({ status, className }: IndicadorIAProps) {
  const config = {
    activo: "bg-[#C8FF00] ia-activa",
    pausado: "bg-[#555552]",
    bloqueado: "bg-[#EF4444]",
    fuera_horario: "bg-[#F59E0B]",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "w-2 h-2 rounded-full ring-2 ring-offset-1",
        config[status],
        status === 'activo' ? "ring-[var(--accent)]/30" : "ring-transparent"
      )} />
      <span className={cn(
        "text-[12px] font-bold capitalize tracking-tight",
        status === 'activo' ? "text-[#8db300]" : "text-[var(--text-secondary-light)]"
      )}>
        {status.replace('_', ' ')}
      </span>
    </div>
  );
}
