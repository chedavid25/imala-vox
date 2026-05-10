"use client";

import React from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { PLAN_LIMITS } from "@/lib/planLimits";
import { cn } from "@/lib/utils";
import { Lock, ArrowRight, Sparkles, Zap, Crown } from "lucide-react";
import Link from "next/link";

type PlanType = "starter" | "pro" | "agencia";

const PLAN_ORDER: Record<PlanType, number> = { starter: 0, pro: 1, agencia: 2 };
const PLAN_LABELS: Record<PlanType, string> = { starter: "Starter", pro: "Pro", agencia: "Agencia" };
const PLAN_PRICES: Record<PlanType, number> = {
  starter: PLAN_LIMITS.starter.priceMonthly,
  pro: PLAN_LIMITS.pro.priceMonthly,
  agencia: PLAN_LIMITS.agencia.priceMonthly,
};
const PLAN_ICONS: Record<PlanType, React.ElementType> = {
  starter: Zap,
  pro: Sparkles,
  agencia: Crown,
};

interface PlanGateProps {
  requiredPlan: PlanType;
  featureName: string;
  featureDescription: string;
  children: React.ReactNode;
  showBlurred?: boolean;
}

export function PlanGate({
  requiredPlan,
  featureName,
  featureDescription,
  children,
  showBlurred = true,
}: PlanGateProps) {
  const { workspace } = useWorkspaceStore();
  const currentPlan = (workspace?.plan as PlanType) || "starter";
  const hasAccess = PLAN_ORDER[currentPlan] >= PLAN_ORDER[requiredPlan];

  if (hasAccess) return <>{children}</>;

  const PlanIcon = PLAN_ICONS[requiredPlan];

  return (
    <div className="relative w-full h-full min-h-[400px]">
      {showBlurred && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
          <div className="blur-[6px] opacity-30 saturate-0">{children}</div>
        </div>
      )}

      <div className={cn(
        "absolute inset-0 z-10 flex items-center justify-center",
        showBlurred ? "bg-[var(--bg-main)]/70 backdrop-blur-[2px]" : "bg-[var(--bg-main)]"
      )}>
        <div className="max-w-md w-full mx-auto px-6 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-sidebar)] border border-[var(--border-dark)] flex items-center justify-center shadow-xl">
              <PlanIcon className="w-7 h-7 text-[var(--accent)]" />
            </div>
          </div>

          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-sidebar)] border border-[var(--accent)]/30 text-[10px] font-black text-[var(--accent)] uppercase tracking-widest">
              <Lock className="w-3 h-3" />
              Plan {PLAN_LABELS[requiredPlan]} requerido
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-[var(--text-primary-light)]">{featureName}</h3>
            <p className="text-sm text-[var(--text-secondary-light)] leading-relaxed">{featureDescription}</p>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-2xl px-5 py-4 space-y-1">
            <p className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">
              Plan {PLAN_LABELS[requiredPlan]}
            </p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-2xl font-bold text-[var(--text-primary-light)]">${PLAN_PRICES[requiredPlan]}</span>
              <span className="text-xs text-[var(--text-tertiary-light)] font-medium">USD/mes</span>
            </div>
          </div>

          <Link
            href="/dashboard/ajustes/facturacion"
            className="inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl shadow-xl shadow-[var(--accent)]/20 transition-all active:scale-95"
          >
            Actualizar a {PLAN_LABELS[requiredPlan]}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <p className="text-[11px] text-[var(--text-tertiary-light)]">Sin contratos · Cancelás cuando querés</p>
        </div>
      </div>
    </div>
  );
}
