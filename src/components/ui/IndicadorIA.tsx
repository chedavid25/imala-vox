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
        "w-2 h-2 rounded-full",
        config[status]
      )} />
      <span className="text-[12px] font-medium text-[var(--text-secondary-light)] capitalize">
        {status.replace('_', ' ')}
      </span>
    </div>
  );
}
