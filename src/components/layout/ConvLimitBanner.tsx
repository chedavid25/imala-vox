"use client";

import React, { useState } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { PLAN_LIMITS } from "@/lib/planLimits";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function ConvLimitBanner() {
  const { workspace } = useWorkspaceStore();
  const [dismissed, setDismissed] = useState(false);

  if (!workspace || dismissed) return null;

  const plan = workspace.plan as "starter" | "pro" | "agencia";
  const limite = PLAN_LIMITS[plan].convCountIA;
  const usado = workspace.uso?.convCount || 0;

  if (typeof limite !== "number") return null; // plan ilimitado

  const pct = (usado / limite) * 100;
  if (pct < 80) return null;

  const isOver = pct >= 100;

  return (
    <div className={cn(
      "flex items-start sm:items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 text-xs font-medium border-b",
      isOver ? "bg-red-50 border-red-200 text-red-800" : "bg-amber-50 border-amber-200 text-amber-800"
    )}>
      <AlertTriangle className={cn("w-4 h-4 shrink-0 mt-0.5 sm:mt-0", isOver ? "text-red-500" : "text-amber-500")} />
      <span className="flex-1 leading-snug">
        {isOver ? (
          <><strong>Límite alcanzado.</strong><span className="hidden sm:inline"> Tu agente dejó de responder automáticamente.</span> <Link href="/dashboard/ajustes/facturacion" className="underline underline-offset-2">Actualizá tu plan.</Link></>
        ) : (
          <>Usaste <strong>{Math.round(pct)}%</strong> de tus sesiones IA ({usado.toLocaleString("es-AR")}/{limite.toLocaleString("es-AR")}).</>
        )}
      </span>
      <Link
        href="/dashboard/ajustes/facturacion"
        className={cn(
          "hidden sm:flex items-center gap-1 font-black text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors shrink-0",
          isOver ? "bg-red-600 text-white hover:bg-red-700" : "bg-amber-600 text-white hover:bg-amber-700"
        )}
      >
        Actualizar <ArrowRight className="w-3 h-3" />
      </Link>
      <button
        onClick={() => setDismissed(true)}
        className={cn("p-1 rounded-md transition-colors shrink-0", isOver ? "hover:bg-red-100" : "hover:bg-amber-100")}
        aria-label="Cerrar"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
