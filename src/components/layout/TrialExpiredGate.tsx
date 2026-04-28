"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { crearSuscripcionMP } from "@/app/actions/billing";
import { PLAN_LIMITS } from "@/lib/planLimits";
import { FloatingWhatsApp } from "@/components/ui/FloatingWhatsApp";
import { Check, Zap, Building2, Rocket, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ALLOWED_PATHS = ["/dashboard/ajustes/facturacion"];

const SUPPORT_WA =
  "https://wa.me/5493513376865?text=" +
  encodeURIComponent("Hola, necesito ayuda con mi cuenta en Imalá Vox.");

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
  highlight: boolean;
  features: string[];
}> = {
  starter: {
    label: "Starter",
    icon: Rocket,
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

  if (!workspace) return null;
  if (!isExpired(workspace)) return null;
  if (ALLOWED_PATHS.some((p) => pathname.startsWith(p))) return null;

  const isPagoVencido = workspace.estado === "pago_vencido";

  const headline = isPagoVencido
    ? "Tu pago no pudo procesarse."
    : "Tu período de prueba finalizó.";

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
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--bg-main)]">

        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-[var(--bg-card)] border-b border-[var(--border-light)] px-6 h-14 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--bg-sidebar)] border border-[var(--accent)]/30 flex items-center justify-center">
              <Zap className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <span className="font-black text-sm tracking-tight text-[var(--text-primary-light)]">Imalá Vox</span>
          </div>
          <a
            href={SUPPORT_WA}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary-light)] hover:text-[var(--text-primary-light)] transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#25D366]">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Contactar soporte
          </a>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto px-4 py-12 space-y-10">

          {/* Headline */}
          <div className="text-center space-y-2">
            <p className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">
              Acceso restringido
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary-light)] tracking-tight leading-tight">
              {headline}<br />
              Elegí el plan que mejor se adapta a tu negocio.
            </h1>
          </div>

          {/* Toggle mensual / anual */}
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-1 bg-[var(--bg-input)] border border-[var(--border-light)] rounded-2xl p-1">
              <button
                onClick={() => setCiclo("mensual")}
                className={cn(
                  "px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                  ciclo === "mensual"
                    ? "bg-[var(--bg-sidebar)] text-white shadow-md"
                    : "text-[var(--text-tertiary-light)] hover:text-[var(--text-primary-light)]"
                )}
              >
                Mensual
              </button>
              <button
                onClick={() => setCiclo("anual")}
                className={cn(
                  "px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2",
                  ciclo === "anual"
                    ? "bg-[var(--bg-sidebar)] text-white shadow-md"
                    : "text-[var(--text-tertiary-light)] hover:text-[var(--text-primary-light)]"
                )}
              >
                Anual
                <span className="bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                  −17%
                </span>
              </button>
            </div>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const meta = PLAN_META[plan];
              const limits = PLAN_LIMITS[plan];
              const price = ciclo === "anual" ? limits.priceYearly : limits.priceMonthly;
              const Icon = meta.icon;
              const isLoading = loading === plan;
              const isDark = meta.highlight;

              return (
                <div
                  key={plan}
                  className={cn(
                    "relative rounded-3xl border flex flex-col overflow-hidden transition-shadow",
                    isDark
                      ? "bg-[var(--bg-sidebar)] border-[var(--accent)]/20 shadow-2xl shadow-black/20"
                      : "bg-[var(--bg-card)] border-[var(--border-light)] shadow-sm hover:shadow-md"
                  )}
                >
                  {/* Accent strip top — solo en Pro */}
                  {isDark && (
                    <div className="h-1 w-full bg-[var(--accent)]" />
                  )}

                  <div className="p-7 space-y-5 flex-1">

                    {/* Plan name + badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center border shrink-0",
                          isDark
                            ? "bg-[var(--accent)] border-transparent"
                            : "bg-[var(--bg-input)] border-[var(--border-light)]"
                        )}>
                          <Icon className={cn(
                            "w-4 h-4",
                            isDark ? "text-[var(--accent-text)]" : "text-[var(--text-secondary-light)]"
                          )} />
                        </div>
                        <span className={cn(
                          "font-black tracking-tight text-sm",
                          isDark ? "text-white" : "text-[var(--text-primary-light)]"
                        )}>
                          {meta.label}
                        </span>
                      </div>
                      {isDark && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[9px] font-black text-[var(--accent)] uppercase tracking-wider">
                          Más popular
                        </span>
                      )}
                    </div>

                    {/* Price */}
                    <div>
                      <div className="flex items-end gap-1.5">
                        <span className={cn(
                          "text-4xl font-black tracking-tighter leading-none",
                          isDark ? "text-white" : "text-[var(--text-primary-light)]"
                        )}>
                          ${price}
                        </span>
                        <span className={cn(
                          "text-xs font-bold uppercase mb-1",
                          isDark ? "text-white/40" : "text-[var(--text-tertiary-light)]"
                        )}>
                          USD/mes
                        </span>
                      </div>
                      {ciclo === "anual" && (
                        <p className={cn(
                          "text-[11px] font-medium mt-1",
                          isDark ? "text-white/40" : "text-[var(--text-tertiary-light)]"
                        )}>
                          Facturado como ${price * 12} USD/año
                        </p>
                      )}
                    </div>

                    <div className={cn("border-t", isDark ? "border-white/10" : "border-[var(--border-light)]")} />

                    {/* Features */}
                    <ul className="space-y-2.5">
                      {meta.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2.5">
                          <Check className={cn(
                            "w-4 h-4 mt-0.5 shrink-0",
                            isDark ? "text-[var(--accent)]" : "text-emerald-600"
                          )} />
                          <span className={cn(
                            "text-sm font-medium",
                            isDark ? "text-white/70" : "text-[var(--text-secondary-light)]"
                          )}>
                            {feat}
                          </span>
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
                        "w-full h-11 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                        isDark
                          ? "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] shadow-xl shadow-[var(--accent)]/20"
                          : "bg-[var(--bg-card)] hover:bg-[var(--bg-input)] text-[var(--text-primary-light)] border border-[var(--border-light)]"
                      )}
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continuar"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-[var(--text-tertiary-light)] font-medium pb-8">
            ¿Tenés dudas?{" "}
            <a
              href={SUPPORT_WA}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-primary-light)] font-bold hover:underline"
            >
              Escribinos por WhatsApp
            </a>
            {" "}y te ayudamos a elegir el mejor plan.
          </p>
        </div>
      </div>

      {/* Botón WhatsApp flotante — z-[100] queda por encima del gate z-50 */}
      <FloatingWhatsApp message="Hola, necesito ayuda con mi cuenta en Imalá Vox." />
    </>
  );
}
