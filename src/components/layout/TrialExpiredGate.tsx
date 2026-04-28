"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { crearSuscripcionMP } from "@/app/actions/billing";
import { PLAN_LIMITS } from "@/lib/planLimits";
import { Check, Zap, Building2, Rocket, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Rutas donde el gate NO aparece
const ALLOWED_PATHS = ["/dashboard/ajustes/facturacion"];

function isExpired(workspace: {
  estado: string;
  pruebaTerminaEl?: { toDate: () => Date } | null;
}): boolean {
  if (workspace.estado === "pago_vencido" || workspace.estado === "cancelado") return true;
  if (workspace.estado === "prueba" && workspace.pruebaTerminaEl) {
    return workspace.pruebaTerminaEl.toDate().getTime() < Date.now();
  }
  return false;
}

type PlanKey = "starter" | "pro" | "agencia";
type Ciclo = "mensual" | "anual";

const PLAN_META: Record<PlanKey, {
  label: string;
  icon: React.ElementType;
  color: string;
  highlight: boolean;
  features: string[];
}> = {
  starter: {
    label: "Starter",
    icon: Rocket,
    color: "border-slate-200 bg-white",
    highlight: false,
    features: [
      "1 Agente inteligente",
      "1.000 conversaciones/mes",
      "1 número de WhatsApp",
      "1.500 contactos CRM",
      "WhatsApp · Instagram · Facebook",
      "Base de conocimiento",
    ],
  },
  pro: {
    label: "Pro",
    icon: Zap,
    color: "border-[var(--accent)] bg-white",
    highlight: true,
    features: [
      "3 Agentes inteligentes",
      "3.000 conversaciones/mes",
      "2 números de WhatsApp",
      "5.000 contactos CRM",
      "WhatsApp · Instagram · Facebook",
      "Catálogo de productos",
      "Difusión masiva",
      "Scraper de sitios web",
    ],
  },
  agencia: {
    label: "Agencia",
    icon: Building2,
    color: "border-slate-200 bg-white",
    highlight: false,
    features: [
      "10 Agentes inteligentes",
      "10.000 conversaciones/mes",
      "5 números de WhatsApp",
      "Contactos ilimitados",
      "WhatsApp · Instagram · Facebook",
      "Catálogo ilimitado",
      "Difusión ilimitada",
      "Workflows automatizados",
      "Acceso a API",
    ],
  },
};

export function TrialExpiredGate() {
  const { workspace, currentWorkspaceId } = useWorkspaceStore();
  const pathname = usePathname();
  const [ciclo, setCiclo] = useState<Ciclo>("mensual");
  const [loading, setLoading] = useState<PlanKey | null>(null);

  // DEBUG — borrar después de confirmar
  console.log('[TrialExpiredGate]', {
    estado: workspace?.estado,
    pruebaTerminaEl: workspace?.pruebaTerminaEl?.toDate?.()?.toISOString?.(),
    isExpired: workspace ? isExpired(workspace) : 'no workspace',
    pathname,
    isAllowed: ALLOWED_PATHS.some((p) => pathname.startsWith(p)),
  });

  if (!workspace) return null;
  if (!isExpired(workspace)) return null;
  if (ALLOWED_PATHS.some((p) => pathname.startsWith(p))) return null;

  const isPagoVencido = workspace.estado === "pago_vencido";

  const headline = isPagoVencido
    ? "Tu pago no pudo procesarse."
    : "Tu período de prueba finalizó.";

  const subheadline = "Elegí el plan que mejor se adapta a tu negocio.";

  const handleSubscribe = async (plan: PlanKey) => {
    if (!currentWorkspaceId) return;
    setLoading(plan);
    try {
      const res = await crearSuscripcionMP(currentWorkspaceId, plan, ciclo);
      if (res.success && res.initPoint) {
        window.location.href = res.initPoint;
      } else {
        toast.error(res.error || "Error al conectar con MercadoPago");
      }
    } catch {
      toast.error("Error inesperado. Intentá de nuevo.");
    } finally {
      setLoading(null);
    }
  };

  const plans: PlanKey[] = ["starter", "pro", "agencia"];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F4F5F7]">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 h-14 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-[var(--bg-sidebar)] flex items-center justify-center">
            <Zap className="size-4 text-[var(--accent)]" />
          </div>
          <span className="font-black text-sm tracking-tight text-slate-800">Imalá Vox</span>
        </div>
        <a
          href="mailto:contacto@imala.com.ar"
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <MessageCircle className="size-4" />
          Contactar soporte
        </a>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-10">
        {/* Headline */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight leading-tight">
            {headline}<br />
            {subheadline}
          </h1>
        </div>

        {/* Ciclo toggle */}
        <div className="flex items-center justify-center gap-3">
          <span className={cn("text-sm font-bold transition-colors", ciclo === "mensual" ? "text-slate-800" : "text-slate-400")}>
            Mensual
          </span>
          <button
            onClick={() => setCiclo(c => c === "mensual" ? "anual" : "mensual")}
            className={cn(
              "relative w-12 h-6 rounded-full transition-colors duration-200",
              ciclo === "anual" ? "bg-[var(--accent)]" : "bg-slate-300"
            )}
          >
            <span className={cn(
              "absolute top-1 size-4 rounded-full bg-white shadow transition-transform duration-200",
              ciclo === "anual" ? "translate-x-7" : "translate-x-1"
            )} />
          </button>
          <span className={cn("text-sm font-bold transition-colors", ciclo === "anual" ? "text-slate-800" : "text-slate-400")}>
            Anual
          </span>
          {ciclo === "anual" && (
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-0.5">
              Ahorrá 17%
            </span>
          )}
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const meta = PLAN_META[plan];
            const limits = PLAN_LIMITS[plan];
            const price = ciclo === "anual" ? limits.priceYearly : limits.priceMonthly;
            const Icon = meta.icon;
            const isLoading = loading === plan;

            return (
              <div
                key={plan}
                className={cn(
                  "relative rounded-[1.75rem] border-2 flex flex-col overflow-hidden transition-shadow",
                  meta.color,
                  meta.highlight
                    ? "shadow-xl shadow-[var(--accent)]/15 ring-2 ring-[var(--accent)]/20"
                    : "shadow-md hover:shadow-lg"
                )}
              >
                {meta.highlight && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--accent)]" />
                )}

                <div className="p-7 space-y-5 flex-1">
                  {/* Plan name */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "size-8 rounded-xl flex items-center justify-center",
                        meta.highlight
                          ? "bg-[var(--accent)] text-black"
                          : "bg-slate-100 text-slate-600"
                      )}>
                        <Icon className="size-4" />
                      </div>
                      <span className="font-black text-slate-800 tracking-tight">{meta.label}</span>
                    </div>
                    {meta.highlight && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] bg-[var(--accent)]/10 rounded-full px-2.5 py-1">
                        Recomendado
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div>
                    <div className="flex items-end gap-1.5">
                      <span className="text-4xl font-black text-slate-800 tracking-tighter leading-none">
                        ${price}
                      </span>
                      <span className="text-sm font-bold text-slate-400 mb-1">USD/mes</span>
                    </div>
                    {ciclo === "anual" && (
                      <p className="text-[11px] text-slate-400 font-medium mt-1">
                        Facturado como ${price * 12} USD/año
                      </p>
                    )}
                  </div>

                  <hr className="border-slate-100" />

                  {/* Features */}
                  <ul className="space-y-2.5">
                    {meta.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-sm text-slate-600 font-medium">
                        <Check className={cn(
                          "size-4 mt-0.5 shrink-0",
                          meta.highlight ? "text-[var(--accent)]" : "text-emerald-500"
                        )} />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                <div className="px-7 pb-7">
                  <Button
                    onClick={() => handleSubscribe(plan)}
                    disabled={loading !== null}
                    className={cn(
                      "w-full h-11 rounded-xl font-black text-sm uppercase tracking-wider transition-all",
                      meta.highlight
                        ? "bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-black shadow-lg shadow-[var(--accent)]/25"
                        : "bg-slate-800 hover:bg-slate-700 text-white"
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Continuar"
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-400 font-medium">
          ¿Tenés dudas?{" "}
          <a href="mailto:contacto@imala.com.ar" className="text-[var(--accent)] font-bold hover:underline">
            Contactá a soporte
          </a>
          {" "}y te ayudamos a elegir el mejor plan.
        </p>
      </div>
    </div>
  );
}
