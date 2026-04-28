"use client";

import React, { useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { crearSuscripcionMP } from "@/app/actions/billing";
import { PLAN_LIMITS } from "@/lib/planLimits";
import { FloatingWhatsApp } from "@/components/ui/FloatingWhatsApp";
import { Check, X, ArrowRight, Loader2 } from "lucide-react";
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

type FeatureGroup = { label: string; items: string[]; locked?: boolean };
const PRICING_FEATURES: Record<PlanKey, { tag?: string; inheritsFrom?: string; groups: FeatureGroup[] }> = {
  starter: {
    groups: [
      { label: "IA & Agentes", items: ["1 Agente Inteligente", "1.000 conversaciones/mes", "Base de conocimiento (PDF, webs)"] },
      { label: "Canales", items: ["WhatsApp · Instagram · Facebook"] },
      { label: "CRM", items: ["1.500 contactos CRM", "Leads, Tareas y Contactos", "Etiquetas y segmentación"] },
      { label: "No incluido", locked: true, items: ["Catálogo de productos", "Difusión masiva", "Meta Ads · Leads", "Workflows"] },
    ],
  },
  pro: {
    tag: "Más popular",
    inheritsFrom: "Starter",
    groups: [
      { label: "IA & Agentes", items: ["Hasta 3 Agentes Inteligentes", "3.000 conversaciones/mes", "5.000 contactos CRM"] },
      { label: "Marketing", items: ["Catálogo de productos (200 items)", "Difusión masiva (hasta 1.000/envío)", "Meta Ads · Leads de campañas"] },
      { label: "No incluido", locked: true, items: ["Workflows automatizados"] },
    ],
  },
  agencia: {
    inheritsFrom: "Pro",
    groups: [
      { label: "IA & Agentes", items: ["Hasta 10 Agentes Inteligentes", "10.000 conversaciones/mes", "Contactos ilimitados"] },
      { label: "Marketing ampliado", items: ["Catálogo ilimitado de productos", "Difusión masiva sin límite"] },
      { label: "Automatización", items: ["Workflows automatizados"] },
    ],
  },
};

export function TrialExpiredGate() {
  const { workspace, currentWorkspaceId } = useWorkspaceStore();
  const pathname = usePathname();
  const [isAnual, setIsAnual] = useState(false);
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
      const res = await crearSuscripcionMP(currentWorkspaceId, plan, isAnual ? "anual" : "mensual");
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
      <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1F1F1E]">

        {/* Navbar — igual que la landing */}
        <nav className="sticky top-0 z-10 bg-[#1F1F1E]/95 backdrop-blur-xl border-b border-white/5 shadow-2xl">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Image src="/icons/icon-192.png" alt="Imalá Vox" width={32} height={32} className="rounded-xl" />
              <span className="text-white font-bold text-lg tracking-tight">Imalá Vox</span>
            </div>
            <a
              href={SUPPORT_WA}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#25D366]">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Contactar soporte
            </a>
          </div>
        </nav>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 py-16 relative">
          {/* Glow de fondo — igual que la landing */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#C8FF00] opacity-[0.03] blur-[120px] rounded-full -mr-64 -mt-32 pointer-events-none" />

          {/* Headline */}
          <div className="text-center mb-12 relative z-10">
            <span className="text-xs font-black text-[#C8FF00]/60 uppercase tracking-widest">
              {isPagoVencido ? "Pago vencido" : "Prueba finalizada"}
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-white mt-3 leading-tight">
              {headline}<br />
              {isPagoVencido ? "Renová tu suscripción para recuperar el acceso." : "Elegí tu plan."}
            </h2>
            <p className="text-base text-white/40 mt-3 font-medium">
              {isPagoVencido
                ? "Seleccioná un plan y completá el pago para volver a activar tu cuenta."
                : "Sin contratos. Cancelás cuando querés."}
            </p>

            {/* Toggle — idéntico al de la landing */}
            <div className="inline-flex items-center gap-1 bg-white/5 border border-white/10 rounded-2xl p-1 mt-8">
              <button
                onClick={() => setIsAnual(false)}
                className={cn(
                  "px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                  !isAnual ? "bg-[#C8FF00] text-black shadow-lg" : "text-white/40 hover:text-white"
                )}
              >
                Mensual
              </button>
              <button
                onClick={() => setIsAnual(true)}
                className={cn(
                  "px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2",
                  isAnual ? "bg-[#C8FF00] text-black shadow-lg" : "text-white/40 hover:text-white"
                )}
              >
                Anual
                <span className="bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                  −17%
                </span>
              </button>
            </div>
          </div>

          {/* Cards — idénticas a la landing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            {plans.map((p) => {
              const price = isAnual ? PLAN_LIMITS[p].priceYearly : PLAN_LIMITS[p].priceMonthly;
              const display = PRICING_FEATURES[p];
              const isPro = p === "pro";
              const isLoading = loading === p;

              return (
                <div
                  key={p}
                  className={cn(
                    "rounded-3xl flex flex-col relative overflow-hidden",
                    isPro
                      ? "bg-[#C8FF00] shadow-2xl shadow-[#C8FF00]/10 scale-[1.03]"
                      : "bg-[#2A2A28] border border-white/5"
                  )}
                >
                  {/* Tag strip */}
                  {display.tag && (
                    <div className={cn(
                      "text-center py-2 text-[9px] font-black uppercase tracking-widest",
                      isPro ? "bg-black/10 text-black/60" : "bg-[#C8FF00]/10 text-[#C8FF00]"
                    )}>
                      {display.tag}
                    </div>
                  )}

                  {/* Price */}
                  <div className="p-8 space-y-1">
                    <h3 className={cn("text-xs font-black uppercase tracking-widest", isPro ? "text-black/50" : "text-white/40")}>
                      {p}
                    </h3>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className={cn("text-4xl font-black", isPro ? "text-black" : "text-white")}>${price}</span>
                      <span className={cn("text-xs font-bold uppercase", isPro ? "text-black/40" : "text-white/30")}>USD/mes</span>
                    </div>
                    {isAnual && (
                      <p className={cn("text-[10px] font-bold", isPro ? "text-black/50" : "text-white/30")}>
                        Facturado anualmente
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <div className={cn("flex-1 px-8 pb-8 space-y-3 border-t", isPro ? "border-black/10" : "border-white/5")}>
                    <div className="pt-5 space-y-3">
                      {display.inheritsFrom && (
                        <div className={cn(
                          "flex items-center gap-2 py-2 px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest",
                          isPro
                            ? "bg-black/10 border-black/10 text-black/50"
                            : "bg-[#C8FF00]/5 border-[#C8FF00]/10 text-[#C8FF00]/60"
                        )}>
                          <div className={cn("w-1.5 h-1.5 rounded-full", isPro ? "bg-black/30" : "bg-[#C8FF00]/40")} />
                          Todo el {display.inheritsFrom}, más:
                        </div>
                      )}
                      {display.groups.map((g, gi) => (
                        <div key={gi} className="space-y-1.5">
                          <p className={cn(
                            "text-[9px] font-black uppercase tracking-widest px-1",
                            g.locked
                              ? (isPro ? "text-black/25" : "text-white/15")
                              : (isPro ? "text-black/40" : "text-white/30")
                          )}>
                            {g.label}
                          </p>
                          {g.items.map((item, ii) => (
                            <div key={ii} className="flex items-center gap-2">
                              {g.locked ? (
                                <div className={cn(
                                  "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                                  isPro ? "bg-black/5 border-black/10" : "bg-white/5 border-white/5"
                                )}>
                                  <X className={cn("w-2.5 h-2.5", isPro ? "text-black/25" : "text-white/15")} />
                                </div>
                              ) : (
                                <div className={cn(
                                  "w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                                  isPro ? "bg-black" : "bg-[#C8FF00]"
                                )}>
                                  <Check className={cn("w-2.5 h-2.5", isPro ? "text-[#C8FF00]" : "text-[#1A1A18]")} strokeWidth={4} />
                                </div>
                              )}
                              <span className={cn(
                                "text-[11px] font-bold",
                                g.locked
                                  ? (isPro ? "text-black/25 line-through decoration-black/20 decoration-1" : "text-white/20 line-through decoration-white/10 decoration-1")
                                  : (isPro ? "text-black/80" : "text-white/70")
                              )}>
                                {item}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA — mismo estilo que la landing, pero llama a handleSubscribe */}
                  <div className="px-8 pb-8">
                    <button
                      onClick={() => handleSubscribe(p)}
                      disabled={loading !== null}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 h-12 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
                        isPro
                          ? "bg-[#1F1F1E] text-[#C8FF00] hover:bg-[#161615] shadow-xl shadow-black/20"
                          : "bg-[#C8FF00]/10 border border-[#C8FF00]/20 text-[#C8FF00] hover:bg-[#C8FF00]/20"
                      )}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          {isPagoVencido ? "Renovar" : "Suscribirme"}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-white/25 mt-10 font-medium pb-8">
            Precios en USD · Cobrado en ARS al dólar blue del día ·{" "}
            <a
              href={SUPPORT_WA}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/50 hover:text-white underline underline-offset-2 transition-colors"
            >
              ¿Necesitás ayuda? Escribinos por WhatsApp
            </a>
          </p>
        </div>
      </div>

      {/* Botón WA flotante — z-[100] sobre el gate z-50 */}
      <FloatingWhatsApp message="Hola, necesito ayuda con mi cuenta en Imalá Vox." />
    </>
  );
}
