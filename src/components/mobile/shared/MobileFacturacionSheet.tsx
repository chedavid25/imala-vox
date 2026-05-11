"use client";

import React, { useState, useEffect } from "react";
import { BottomSheet } from "./BottomSheet";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { PLAN_LIMITS } from "@/lib/planLimits";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, limit } from "firebase/firestore";
import { COLLECTIONS, EventoFacturacion } from "@/lib/types/firestore";
import { crearSuscripcionMP, cancelarSuscripcionMP, cambiarPlan, obtenerCotizacionBlue } from "@/app/actions/billing";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Zap, Check, X, AlertCircle, Loader2,
  History, ChevronRight, ChevronLeft, ExternalLink, Info,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Plan = "starter" | "pro" | "agencia";

type FeatureItem = { text: string };
type FeatureGroup = { label: string; items: FeatureItem[]; locked?: boolean };

const PLAN_DISPLAY: Record<Plan, { inheritsFrom?: string; groups: FeatureGroup[] }> = {
  starter: {
    groups: [
      {
        label: "IA & Agentes",
        items: [
          { text: "1 Agente Inteligente" },
          { text: "1.000 conversaciones/mes" },
          { text: "Base de conocimiento" },
        ],
      },
      {
        label: "Canales",
        items: [{ text: "WhatsApp · Instagram · Facebook" }],
      },
      {
        label: "CRM",
        items: [
          { text: "1.500 contactos CRM" },
          { text: "Leads, Tareas y Contactos" },
          { text: "Etiquetas y segmentación" },
        ],
      },
      {
        label: "No incluido",
        locked: true,
        items: [
          { text: "Catálogo de productos" },
          { text: "Difusión masiva" },
          { text: "Workflows automatizados" },
        ],
      },
    ],
  },
  pro: {
    inheritsFrom: "Starter",
    groups: [
      {
        label: "IA & Agentes",
        items: [
          { text: "Hasta 3 Agentes Inteligentes" },
          { text: "3.000 conversaciones/mes" },
          { text: "5.000 contactos CRM" },
        ],
      },
      {
        label: "Marketing",
        items: [
          { text: "Catálogo de productos (200 items)" },
          { text: "Difusión masiva (hasta 1.000/envío)" },
          { text: "Meta Ads · Leads de campañas" },
        ],
      },
      {
        label: "No incluido",
        locked: true,
        items: [{ text: "Workflows automatizados" }],
      },
    ],
  },
  agencia: {
    inheritsFrom: "Pro",
    groups: [
      {
        label: "IA & Agentes",
        items: [
          { text: "Hasta 10 Agentes Inteligentes" },
          { text: "10.000 conversaciones/mes" },
          { text: "Contactos ilimitados" },
        ],
      },
      {
        label: "Marketing ampliado",
        items: [
          { text: "Catálogo ilimitado de productos" },
          { text: "Difusión masiva sin límite" },
        ],
      },
      {
        label: "Automatización",
        items: [{ text: "Workflows automatizados" }],
      },
    ],
  },
};

const STATUS_CONFIG = {
  prueba:       { label: "En Prueba",    color: "bg-amber-50 text-amber-600 border-amber-100" },
  activo:       { label: "Activo",       color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  pago_vencido: { label: "Pago Vencido", color: "bg-rose-50 text-rose-600 border-rose-100" },
  cancelado:    { label: "Cancelado",    color: "bg-slate-50 text-slate-600 border-slate-100" },
};

export function MobileFacturacionSheet({ open, onClose }: Props) {
  const { workspace, currentWorkspaceId } = useWorkspaceStore();
  const [isAnual, setIsAnual] = useState(false);
  const [cotizacion, setCotizacion] = useState<number | null>(null);
  const [history, setHistory] = useState<(EventoFacturacion & { id: string })[]>([]);
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [view, setView] = useState<"main" | "plans" | "history">("main");

  useEffect(() => {
    if (!open) { setView("main"); setConfirmCancel(false); return; }
    obtenerCotizacionBlue().then(setCotizacion);
  }, [open]);

  useEffect(() => {
    if (!currentWorkspaceId || !open) return;
    const q = query(
      collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.EVENTOS_FACT),
      orderBy("creadoEl", "desc"),
      limit(15)
    );
    return onSnapshot(q, (snap) => {
      setHistory(
        snap.docs
          .map(d => ({ ...d.data(), id: d.id }) as EventoFacturacion & { id: string })
          .filter(e => ["pago_exitoso", "pago_fallido", "upgrade", "downgrade", "suscripcion_creada"].includes(e.tipo))
      );
    });
  }, [currentWorkspaceId, open]);

  if (!workspace) return null;

  const currentPlan = workspace.plan as Plan;
  const statusCfg = STATUS_CONFIG[workspace.estado as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.prueba;
  const diasRestantes = workspace.pruebaTerminaEl
    ? Math.max(0, Math.ceil((workspace.pruebaTerminaEl.toDate().getTime() - Date.now()) / 86400000))
    : 0;
  const porcentajePrueba = Math.max(0, Math.min(100, (diasRestantes / 7) * 100));

  const handleSubscribe = async (plan: Plan) => {
    setLoadingPlan(plan);
    try {
      const res = await crearSuscripcionMP(currentWorkspaceId!, plan, isAnual ? "anual" : "mensual");
      if (res.success && res.initPoint) {
        window.location.href = res.initPoint;
      } else {
        toast.error(res.error || "Error al conectar con MercadoPago");
      }
    } catch {
      toast.error("Error inesperado");
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleChangePlan = async (plan: Plan) => {
    if (plan === currentPlan) return;
    setLoadingPlan(plan);
    try {
      const res = await cambiarPlan(currentWorkspaceId!, plan);
      if (res.success && res.initPoint) {
        window.location.href = res.initPoint;
      } else if (res.success) {
        toast.success("Plan actualizado");
      } else {
        toast.error(res.error || "Error al cambiar plan");
      }
    } catch {
      toast.error("Error al procesar");
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleCancel = async () => {
    try {
      const res = await cancelarSuscripcionMP(currentWorkspaceId!);
      if (res.success) {
        toast.success("Suscripción cancelada");
        setConfirmCancel(false);
      } else {
        toast.error("Error al cancelar");
      }
    } catch {
      toast.error("Error al cancelar");
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} maxHeight="92dvh">
      <div className="space-y-4 pb-8">

        {/* Header */}
        <div className="flex items-center gap-3 px-1 pb-3 border-b border-[var(--border-light)]">
          {view !== "main" && (
            <button
              onClick={() => setView("main")}
              className="size-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0"
            >
              <ChevronLeft size={16} className="text-slate-500" />
            </button>
          )}
          <div>
            <h3 className="font-black text-[var(--text-primary-light)] text-base uppercase tracking-tight">
              {view === "main" ? "Facturación y Plan" : view === "plans" ? "Mejorar Nivel de IA" : "Historial de Pagos"}
            </h3>
            <p className="text-[10px] text-[var(--text-tertiary-light)] font-medium mt-0.5 uppercase tracking-widest">
              {view === "main" ? "Gestión de cuenta"
                : view === "plans" ? "Elegí el plan ideal"
                : "Registro de transacciones"}
            </p>
          </div>
        </div>

        {/* ── VISTA PRINCIPAL ── */}
        {view === "main" && (
          <>
            {/* Tarjeta de suscripción actual */}
            <div className="p-6 bg-slate-900 rounded-[28px] space-y-5">
              {/* Ícono + Plan + Estado */}
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 rounded-[1.5rem] bg-[var(--bg-sidebar)] flex items-center justify-center border border-[var(--border-dark)] shadow-sm">
                  <Zap className="size-8 text-[var(--accent)]" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Plan Actual</p>
                  <p className="text-2xl font-black text-white uppercase tracking-tight mt-0.5">Plan {currentPlan}</p>
                </div>
                <span className={cn("text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border", statusCfg.color)}>
                  {statusCfg.label}
                </span>
              </div>

              {/* Barra de prueba */}
              {workspace.estado === "prueba" && (
                <div className="space-y-2 px-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Días de Prueba</span>
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">{diasRestantes} restantes</span>
                  </div>
                  <Progress value={porcentajePrueba} className="h-1.5 bg-white/10" />
                  <p className="text-[10px] text-white/30 text-center font-medium">
                    Acceso de cortesía hasta el <strong className="text-white/50">{workspace.pruebaTerminaEl?.toDate().toLocaleDateString("es-AR")}</strong>
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="space-y-0 divide-y divide-white/10">
                <div className="flex justify-between items-center py-3">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Precio ARS</span>
                  <span className="text-sm font-black text-white">
                    {cotizacion
                      ? `$${Math.round((workspace.facturacion?.precioUSD || PLAN_LIMITS[currentPlan].priceMonthly) * cotizacion * 1.10).toLocaleString("es-AR")}`
                      : "..."}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Dólar Blue</span>
                  <span className="text-xs font-black text-white/60">
                    {cotizacion ? `$${cotizacion.toLocaleString("es-AR")}` : "..."}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Renovación</span>
                  <span className="text-xs font-black text-white">
                    {workspace.periodoVigenteHasta
                      ? workspace.periodoVigenteHasta.toDate().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Info ARS */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
              <Info className="size-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                Los precios en ARS se ajustan trimestralmente por paridad operativa. Próximo ajuste:{" "}
                <strong className="font-bold">
                  {workspace.facturacion?.proximaActualizacion?.toDate().toLocaleDateString("es-AR") ?? "próximamente"}
                </strong>.
              </p>
            </div>

            {/* Acciones */}
            <div className="space-y-1">
              <button
                onClick={() => setView("plans")}
                className="w-full flex items-center gap-4 p-4 bg-[var(--accent)] rounded-2xl active:scale-[0.98] transition-all"
              >
                <div className="size-10 rounded-xl bg-black/10 flex items-center justify-center">
                  <Zap size={20} className="text-black" />
                </div>
                <span className="font-black text-black text-[10px] flex-1 text-left uppercase tracking-widest">
                  {workspace.estado === "prueba" ? "Elegir un plan" : "Ver / Cambiar plan"}
                </span>
                <ChevronRight size={16} className="text-black/40" />
              </button>

              <button
                onClick={() => setView("history")}
                className="w-full flex items-center gap-4 p-4 rounded-2xl active:bg-slate-50 transition-colors border border-[var(--border-light)]"
              >
                <div className="size-10 rounded-xl bg-white border border-[var(--border-light)] flex items-center justify-center text-[var(--text-secondary-light)] shadow-sm">
                  <History size={20} />
                </div>
                <span className="font-black text-[var(--text-primary-light)] text-[10px] flex-1 text-left uppercase tracking-widest">Historial de pagos</span>
                <ChevronRight size={16} className="text-[var(--text-tertiary-light)]" />
              </button>
            </div>

            {/* Cancelar suscripción */}
            {workspace.estado === "activo" && (
              <div className="border-t border-[var(--border-light)] pt-2">
                {!confirmCancel ? (
                  <button
                    onClick={() => setConfirmCancel(true)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl text-rose-500 active:bg-rose-50 transition-all"
                  >
                    <div className="size-10 rounded-xl bg-rose-50 flex items-center justify-center">
                      <X size={18} />
                    </div>
                    <span className="font-black text-[10px] uppercase tracking-widest">Cancelar suscripción</span>
                  </button>
                ) : (
                  <div className="p-5 bg-rose-50 rounded-[20px] border border-rose-100 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="size-10 rounded-2xl bg-rose-500 flex items-center justify-center text-white shrink-0">
                        <AlertCircle size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-rose-900 tracking-tight">¿Confirmar cancelación?</p>
                        <p className="text-[11px] text-rose-700 leading-relaxed font-medium mt-1">
                          Tus agentes dejarán de responder al finalizar el período actual. Tus datos se conservan 30 días.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancel}
                        className="flex-1 py-3 bg-rose-600 text-white font-black text-[9px] uppercase tracking-widest rounded-2xl active:scale-95 transition-all shadow-lg shadow-rose-500/20"
                      >
                        Sí, cancelar
                      </button>
                      <button
                        onClick={() => setConfirmCancel(false)}
                        className="flex-1 py-3 bg-white border border-rose-100 text-rose-500 font-black text-[9px] uppercase tracking-widest rounded-2xl"
                      >
                        No, mantener
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── VISTA PLANES ── */}
        {view === "plans" && (
          <>
            {/* Toggle mensual/anual */}
            <div className="flex items-center gap-1 p-1 bg-white border border-[var(--border-light)] rounded-2xl shadow-sm">
              <button
                onClick={() => setIsAnual(false)}
                className={cn(
                  "flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                  !isAnual
                    ? "bg-[var(--accent)] text-[var(--accent-text)] shadow-lg"
                    : "text-[var(--text-tertiary-light)]"
                )}
              >Mensual</button>
              <button
                onClick={() => setIsAnual(true)}
                className={cn(
                  "flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5",
                  isAnual
                    ? "bg-[var(--accent)] text-[var(--accent-text)] shadow-lg"
                    : "text-[var(--text-tertiary-light)]"
                )}
              >
                Anual
                <span className={cn(
                  "text-[8px] font-black px-2 py-0.5 rounded-lg",
                  isAnual ? "bg-black/10 text-black" : "bg-emerald-50 text-emerald-600"
                )}>-20%</span>
              </button>
            </div>

            {/* Cards de planes */}
            <div className="space-y-4">
              {(["starter", "pro", "agencia"] as Plan[]).map((plan) => {
                const price = isAnual ? PLAN_LIMITS[plan].priceYearly : PLAN_LIMITS[plan].priceMonthly;
                const isCurrent = plan === currentPlan;
                const isPro = plan === "pro";
                const isLoading = loadingPlan === plan;
                const display = PLAN_DISPLAY[plan];

                return (
                  <div
                    key={plan}
                    className={cn(
                      "relative bg-white rounded-[28px] overflow-hidden transition-all",
                      isCurrent
                        ? "ring-2 ring-[var(--accent)] border-transparent shadow-2xl"
                        : "border border-[var(--border-light)] shadow-sm"
                    )}
                  >
                    {isCurrent && (
                      <div className="absolute top-0 right-0">
                        <div className="bg-[var(--accent)] text-[var(--accent-text)] text-[8px] font-black uppercase px-4 py-1.5 rounded-bl-2xl tracking-widest">
                          Activo
                        </div>
                      </div>
                    )}

                    {/* Header del plan */}
                    <div className="text-center px-6 pt-7 pb-5 space-y-2">
                      <p className="text-sm font-black uppercase tracking-widest text-[var(--text-primary-light)]">{plan}</p>
                      {isPro && !isCurrent && (
                        <span className="inline-block bg-emerald-500 text-white text-[8px] font-black uppercase px-3 py-1 rounded-full shadow-lg shadow-emerald-500/20 tracking-widest">
                          Recomendado
                        </span>
                      )}
                      <div className="flex items-baseline justify-center gap-1 pt-1">
                        <span className="text-3xl font-black text-[var(--text-primary-light)]">${price}</span>
                        <span className="text-[10px] font-bold text-[var(--text-tertiary-light)] uppercase tracking-widest">USD</span>
                      </div>
                      <p className="text-[9px] font-bold text-[var(--text-tertiary-light)] uppercase tracking-widest">
                        Facturación {isAnual ? "Anual" : "Mensual"}
                      </p>
                    </div>

                    {/* Features */}
                    <div className="px-5 pb-5 border-t border-slate-50 pt-4 space-y-3">
                      {display.inheritsFrom && (
                        <div className="flex items-center gap-2 py-1.5 px-3 bg-emerald-50/70 rounded-xl border border-emerald-100">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">
                            Todo el {display.inheritsFrom}, más:
                          </span>
                        </div>
                      )}
                      {display.groups.map((group, gi) => (
                        <div key={gi} className="space-y-1.5">
                          <p className={cn(
                            "text-[9px] font-black uppercase tracking-widest px-1 pt-0.5",
                            group.locked ? "text-slate-400" : "text-[var(--text-tertiary-light)]"
                          )}>
                            {group.label}
                          </p>
                          {group.items.map((item, ii) => (
                            <div key={ii} className="flex items-center gap-2">
                              {group.locked ? (
                                <div className="w-4 h-4 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                  <X className="size-2.5 text-slate-400" />
                                </div>
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                  <Check className="size-2.5 text-emerald-600" />
                                </div>
                              )}
                              <span className={cn(
                                "text-[11px] font-bold",
                                group.locked
                                  ? "text-slate-400 line-through decoration-slate-300 decoration-1"
                                  : "text-[var(--text-secondary-light)]"
                              )}>
                                {item.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <div className="px-5 pb-6">
                      <button
                        disabled={isCurrent || !!loadingPlan}
                        onClick={() => workspace.estado === "prueba" ? handleSubscribe(plan) : handleChangePlan(plan)}
                        className={cn(
                          "w-full h-11 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center",
                          isCurrent
                            ? "bg-slate-100 text-slate-400 cursor-default"
                            : "bg-[var(--accent)] text-[var(--accent-text)] shadow-xl shadow-[var(--accent)]/10 disabled:opacity-50"
                        )}
                      >
                        {isLoading
                          ? <Loader2 size={16} className="animate-spin" />
                          : isCurrent ? "Plan Actual"
                          : workspace.estado === "prueba" ? "Suscribirse"
                          : "Cambiar Plan"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── VISTA HISTORIAL ── */}
        {view === "history" && (
          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3 text-center">
                <div className="w-16 h-16 rounded-[1.5rem] bg-white border border-[var(--border-light)] flex items-center justify-center shadow-sm">
                  <History size={28} className="text-slate-300" />
                </div>
                <p className="text-sm font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Sin movimientos</p>
                <p className="text-[11px] text-[var(--text-tertiary-light)] font-medium">Tus pagos aparecerán acá.</p>
              </div>
            ) : history.map((event) => {
              const isOk = event.tipo === "pago_exitoso" || event.tipo === "upgrade";
              return (
                <div key={event.id} className={cn(
                  "flex items-start gap-3 p-4 rounded-2xl border",
                  isOk
                    ? "bg-emerald-50 border-emerald-100"
                    : "bg-rose-50 border-rose-100"
                )}>
                  <div className={cn(
                    "size-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                    isOk ? "bg-emerald-100" : "bg-rose-100"
                  )}>
                    {isOk
                      ? <Check size={14} className="text-emerald-600" />
                      : <X size={14} className="text-rose-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[var(--text-primary-light)] leading-snug">{event.descripcion}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border",
                        isOk
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : "bg-rose-100 text-rose-600 border-rose-200"
                      )}>
                        {event.tipo === "pago_exitoso" ? "Pagado"
                          : event.tipo === "upgrade" ? "Upgrade"
                          : event.tipo === "downgrade" ? "Downgrade"
                          : event.tipo === "suscripcion_creada" ? "Iniciado"
                          : "Fallo"}
                      </span>
                      <p className="text-[10px] font-medium text-[var(--text-tertiary-light)]">
                        {event.creadoEl?.toDate().toLocaleDateString("es-AR")}
                      </p>
                      {(event.monto ?? 0) > 0 && (
                        <p className="text-[10px] font-black text-[var(--text-secondary-light)]">
                          ${event.monto!.toLocaleString("es-AR")} ARS
                        </p>
                      )}
                    </div>
                  </div>
                  {event.mpPagoId && (
                    <a
                      href={`https://www.mercadopago.com.ar/activities?query=${event.mpPagoId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="size-8 rounded-xl bg-white border border-[var(--border-light)] flex items-center justify-center shrink-0 shadow-sm"
                    >
                      <ExternalLink size={12} className="text-[var(--text-tertiary-light)]" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </BottomSheet>
  );
}
