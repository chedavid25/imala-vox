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

const SUPPORT_WA = "https://wa.me/5493513376865?text=" + encodeURIComponent(
  "Hola, necesito ayuda con mi cuenta en Imalá Vox."
);

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
            href={SUPPORT_WA}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="size-4 fill-current text-[#25D366]">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Contactar soporte
          </a>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto px-4 py-12 space-y-10">
          {/* Headline */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight leading-tight">
              {headline}<br />
              Elegí el plan que mejor se adapta a tu negocio.
            </h1>
          </div>

          {/* Ciclo toggle — mismo estilo que la landing */}
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
              <button
                onClick={() => setCiclo("mensual")}
                className={cn(
                  "px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                  ciclo === "mensual"
                    ? "bg-slate-800 text-white shadow-md"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                Mensual
              </button>
              <button
                onClick={() => setCiclo("anual")}
                className={cn(
                  "px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2",
                  ciclo === "anual"
                    ? "bg-slate-800 text-white shadow-md"
                    : "text-slate-500 hover:text-slate-700"
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

              return (
                <div
                  key={plan}
                  className={cn(
                    "relative rounded-[1.75rem] border-2 flex flex-col overflow-hidden transition-shadow",
                    meta.highlight
                      ? "border-slate-800 bg-white shadow-xl ring-2 ring-slate-800/10"
                      : "border-slate-200 bg-white shadow-md hover:shadow-lg"
                  )}
                >
                  {meta.highlight && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800" />
                  )}

                  <div className="p-7 space-y-5 flex-1">
                    {/* Plan name */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "size-8 rounded-xl flex items-center justify-center",
                          meta.highlight ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"
                        )}>
                          <Icon className="size-4" />
                        </div>
                        <span className="font-black text-slate-800 tracking-tight">{meta.label}</span>
                      </div>
                      {meta.highlight && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 rounded-full px-2.5 py-1">
                          Más popular
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
                          <Check className="size-4 mt-0.5 shrink-0 text-emerald-500" />
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
                          ? "bg-slate-800 hover:bg-slate-700 text-white shadow-lg"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                      )}
                    >
                      {isLoading ? <Loader2 className="size-4 animate-spin" /> : "Continuar"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-slate-400 font-medium pb-8">
            ¿Tenés dudas?{" "}
            <a
              href={SUPPORT_WA}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-700 font-bold hover:underline"
            >
              Escribinos por WhatsApp
            </a>
            {" "}y te ayudamos a elegir el mejor plan.
          </p>
        </div>
      </div>

      {/* Botón WhatsApp flotante sobre el gate */}
      <FloatingWhatsApp message="Hola, necesito ayuda con mi cuenta en Imalá Vox." />
    </>
  );
}
