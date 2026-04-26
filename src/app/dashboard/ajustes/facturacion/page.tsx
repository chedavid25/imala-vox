"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Check,
  X,
  ChevronRight,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Clock,
  History,
  Info,
  ExternalLink,
  ChevronDown,
  HelpCircle,
  Lightbulb,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { PLAN_LIMITS } from "@/lib/planLimits";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { COLLECTIONS, EventoFacturacion } from "@/lib/types/firestore";
import { toast } from "sonner";
import { crearSuscripcionMP, cancelarSuscripcionMP, cambiarPlan, obtenerCotizacionBlue } from "@/app/actions/billing";
import { cn } from "@/lib/utils";

type FeatureItem = { text: string; tooltip?: string };
type FeatureGroup = { label: string; items: FeatureItem[]; locked?: boolean };
type PlanDisplay = { inheritsFrom?: string; groups: FeatureGroup[] };

const PLAN_DISPLAY: Record<'starter' | 'pro' | 'agencia', PlanDisplay> = {
  starter: {
    groups: [
      {
        label: "IA & Agentes",
        items: [
          { text: "1 Agente Inteligente", tooltip: "Experto virtual entrenado con tu información. Responde 24/7 en todos tus canales." },
          { text: "1.000 conversaciones/mes", tooltip: "Cada conversación es una sesión con un cliente. Mensajes ilimitados por sesión." },
          { text: "Base de conocimiento", tooltip: "Entrená a tu agente con archivos PDF, textos y sitios web." },
        ],
      },
      {
        label: "Canales",
        items: [
          { text: "WhatsApp · Instagram · Facebook" },
        ],
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
          { text: "Meta Ads · Captura de leads" },
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
          { text: "Hasta 3 Agentes Inteligentes", tooltip: "Cada agente con su propio rol, conocimiento y comportamiento independiente." },
          { text: "3.000 conversaciones/mes" },
          { text: "5.000 contactos CRM" },
        ],
      },
      {
        label: "Marketing",
        items: [
          { text: "Catálogo de productos (200 items)", tooltip: "Mostrá tus productos directamente en el chat y automatizaciones." },
          { text: "Difusión masiva (hasta 1.000/envío)", tooltip: "Enviá mensajes en masa a segmentos de contactos con seguimiento." },
          { text: "Meta Ads · Leads de campañas", tooltip: "Captura automática de leads desde campañas de Facebook e Instagram." },
        ],
      },
      {
        label: "No incluido",
        locked: true,
        items: [
          { text: "Workflows automatizados" },
        ],
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
        items: [
          { text: "Workflows automatizados", tooltip: "Flujos visuales para automatizar respuestas, notificaciones y acciones complejas." },
        ],
      },
    ],
  },
};

export default function FacturacionPage() {
  const { workspace, currentWorkspaceId } = useWorkspaceStore();
  const [history, setHistory] = useState<(EventoFacturacion & { id: string })[]>([]);
  const [isAnual, setIsAnual] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [cotizacion, setCotizacion] = useState<number | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [targetPlan, setTargetPlan] = useState<'starter' | 'pro' | 'agencia' | null>(null);
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const ayudaFacturacion = {
    titulo: "Facturación y Suscripciones",
    descripcion: "Gestiona tu plan operativo, controla los gastos y accede a tu historial de facturación de forma transparente.",
    items: [
      { titulo: "Cotización Blue", detalle: "Los precios se basan en USD pero se cobran en ARS. Usamos la cotización blue del día (con ajuste trimestral) para mayor estabilidad." },
      { titulo: "Ciclos de Pago", detalle: "Puedes elegir facturación mensual o anual. El plan anual incluye un 20% de descuento (2 meses gratis)." },
      { titulo: "Cambios de Plan", detalle: "Los upgrades son inmediatos. Al cambiar de plan, MercadoPago procesará la diferencia o el nuevo ciclo automáticamente." },
    ]
  };

  useEffect(() => {
    obtenerCotizacionBlue().then(setCotizacion);
  }, []);

  useEffect(() => {
    if (!currentWorkspaceId) return;

    const q = query(
      collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.EVENTOS_FACT),
      orderBy("creadoEl", "desc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const events = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (EventoFacturacion & { id: string })[];
      setHistory(events.filter(e => 
        ['pago_exitoso', 'pago_fallido', 'upgrade', 'downgrade', 'suscripcion_creada'].includes(e.tipo)
      ));
    });

    return () => unsubscribe();
  }, [currentWorkspaceId]);

  if (!workspace) return null;

  // Componente local para Tooltips informativos
  const InfoTooltip = ({ text }: { text: string }) => (
    <div className="group relative inline-block ml-1 align-middle">
      <HelpCircle className="size-3 text-[var(--text-tertiary-light)] cursor-help hover:text-[var(--accent)] transition-colors" />
      <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-[#1F1F1E] text-white text-[11px] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 border border-white/10 leading-relaxed font-semibold">
        {text}
        <div className="absolute top-full right-4 border-8 border-transparent border-t-[#1F1F1E]" />
      </div>
    </div>
  );

  const currentPlan = workspace.plan;
  const statusLabels = {
    prueba: { label: "En Prueba", color: "bg-amber-50 text-amber-600 border-amber-100" },
    activo: { label: "Activo", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
    pago_vencido: { label: "Pago Vencido", color: "bg-rose-50 text-rose-600 border-rose-100" },
    cancelado: { label: "Cancelado", color: "bg-slate-50 text-slate-600 border-slate-100" },
  };

  const diasRestantes = workspace.pruebaTerminaEl
    ? Math.ceil((workspace.pruebaTerminaEl.toDate().getTime() - Date.now()) / 86400000)
    : 0;
  
  const porcentajePrueba = Math.max(0, Math.min(100, (diasRestantes / 7) * 100));

  const handleCreateSubscription = async (plan: 'starter' | 'pro' | 'agencia') => {
    setLoadingAction(plan);
    try {
      const res = await crearSuscripcionMP(currentWorkspaceId!, plan, isAnual ? 'anual' : 'mensual');
      if (res.success && res.initPoint) {
        window.location.href = res.initPoint;
      } else {
        toast.error(res.error || "Error al conectar con MercadoPago");
      }
    } catch (err) {
      toast.error("Error inesperado en el proceso de pago");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleUpgrade = async (plan: 'starter' | 'pro' | 'agencia') => {
    if (plan === currentPlan) return;
    setTargetPlan(plan);
    setIsUpgradeDialogOpen(true);
  };

  const confirmUpgrade = async () => {
    if (!targetPlan) return;
    setIsUpgradeDialogOpen(false);
    setLoadingAction(targetPlan);
    try {
      const res = await cambiarPlan(currentWorkspaceId!, targetPlan);
      if (res.success && res.initPoint) {
        window.location.href = res.initPoint;
      } else if (res.success) {
        toast.success("Plan actualizado correctamente");
      } else {
        toast.error(res.error || "Error al cambiar de plan");
      }
    } catch (err) {
      toast.error("Error al procesar el cambio de plan");
    } finally {
      setLoadingAction(null);
      setTargetPlan(null);
    }
  };

  const nextBillingDate = () => {
    const d = new Date();
    if (isAnual) d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-[var(--text-tertiary-light)]" />
            <span className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Gestión de Cuenta</span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary-light)] tracking-tight">Facturación y Gestión de Plan</h1>
          <p className="text-sm text-[var(--text-tertiary-light)] font-medium max-w-md">Controla tus suscripciones, historial de pagos y límites operativos.</p>
        </div>

        <button
          onClick={() => setShowHelp(v => !v)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all shrink-0 h-11",
            showHelp
              ? "bg-[var(--bg-sidebar)] border-[var(--border-dark)] text-[var(--accent)]"
              : "bg-white border-[var(--border-light)] text-[var(--text-secondary-light)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary-light)]"
          )}
        >
          <HelpCircle className="w-4 h-4" />
          ¿Cómo funciona el pago?
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showHelp && "rotate-180")} />
        </button>
      </div>

      {/* Panel de ayuda expandible */}
      {showHelp && (
        <div className="bg-white border border-[var(--border-light)] rounded-[32px] overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-8 pt-8 pb-6 border-b border-[var(--border-light)]">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-[var(--bg-sidebar)] border border-[var(--border-dark)] flex items-center justify-center shrink-0 shadow-sm">
                <Lightbulb className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-[var(--text-primary-light)]">{ayudaFacturacion.titulo}</h3>
                <p className="text-sm text-[var(--text-secondary-light)] leading-relaxed">{ayudaFacturacion.descripcion}</p>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {ayudaFacturacion.items.map((item, i) => (
                <div key={i} className="bg-[var(--bg-input)]/30 border border-[var(--border-light)] rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-active)] shrink-0" />
                    <span className="text-[12px] font-bold text-[var(--text-primary-light)] uppercase tracking-tight">{item.titulo}</span>
                  </div>
                  <p className="text-[12px] text-[var(--text-tertiary-light)] leading-relaxed pl-3.5 font-medium">{item.detalle}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SECCIÓN 1: ESTADO ACTUAL */}
        <Card className="lg:col-span-1 bg-white border border-[var(--border-light)] rounded-[32px] shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="px-8 pt-8 pb-4 border-b border-[var(--border-light)] bg-slate-50/30">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary-light)]">Suscripción Actual</CardTitle>
          </CardHeader>
          <CardContent className="p-8 flex-grow space-y-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 rounded-[2rem] bg-[var(--bg-sidebar)] flex items-center justify-center border border-[var(--border-dark)] shadow-sm">
                <Zap className="size-10 text-[var(--accent)]" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-[var(--text-primary-light)] uppercase tracking-tight">Plan {workspace.plan}</h3>
                <Badge className={cn("mt-2 rounded-xl px-4 py-1 border font-black text-[10px] uppercase tracking-widest", statusLabels[workspace.estado as keyof typeof statusLabels]?.color)}>
                  {statusLabels[workspace.estado as keyof typeof statusLabels]?.label}
                </Badge>
              </div>
            </div>

            {workspace.estado === 'prueba' && (
              <div className="space-y-4 p-5 bg-[var(--bg-input)]/30 rounded-[2rem] border border-[var(--border-light)]">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Días de Prueba</span>
                  <span className="text-amber-600 font-black text-xs uppercase tracking-widest">{diasRestantes} restantes</span>
                </div>
                <Progress value={porcentajePrueba} className="h-2 bg-white border border-[var(--border-light)]" />
                <p className="text-[10px] text-[var(--text-tertiary-light)] leading-relaxed font-medium text-center">
                  Acceso de cortesía hasta el <strong>{workspace.pruebaTerminaEl?.toDate().toLocaleDateString()}</strong>.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2.5 border-b border-[var(--border-light)]">
                <span className="text-[11px] font-bold text-[var(--text-tertiary-light)] uppercase tracking-tight">Precio ARS</span>
                <span className="text-sm font-black text-[var(--text-primary-light)]">
                  {cotizacion 
                    ? `$${Math.round((workspace.facturacion?.precioUSD || PLAN_LIMITS[workspace.plan as keyof typeof PLAN_LIMITS].priceMonthly) * cotizacion * 1.10).toLocaleString('es-AR')}` 
                    : '...'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-[var(--border-light)]">
                <span className="text-[11px] font-bold text-[var(--text-tertiary-light)] uppercase tracking-tight">Dólar Blue</span>
                <span className="text-xs font-black text-[var(--text-secondary-light)]">
                  {cotizacion ? `$${cotizacion.toLocaleString('es-AR')}` : '...'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-[11px] font-bold text-[var(--text-tertiary-light)] uppercase tracking-tight">Renovación</span>
                <span className="text-xs font-black text-[var(--text-primary-light)]">
                  {workspace.periodoVigenteHasta?.toDate().toLocaleDateString() || "N/A"}
                </span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
              <Info className="size-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                Los precios en ARS se ajustan trimestralmente por paridad operativa. Próximo ajuste: <strong className="font-bold">{workspace.facturacion?.proximaActualizacion?.toDate().toLocaleDateString()}</strong>.
              </p>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50/50 border-t border-[var(--border-light)] p-6 flex justify-center items-center">
             <Button 
               variant="ghost" 
               className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-all px-8 h-10 rounded-xl" 
               onClick={() => setIsCancelDialogOpen(true)}
             >
               {workspace.estado === 'cancelado' ? "Suscripción ya cancelada" : "Cancelar suscripción"}
             </Button>

             <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
               <DialogContent className="max-w-md bg-white border-none shadow-2xl rounded-[32px] overflow-hidden p-0">
                 <DialogHeader className="bg-rose-50/50 p-8 pb-4">
                   <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3 text-rose-900">
                      <div className="size-10 rounded-2xl bg-rose-500 flex items-center justify-center text-white">
                        <AlertCircle className="size-5" />
                      </div>
                      ¿Confirmar Cancelación?
                   </DialogTitle>
                 </DialogHeader>
                 <div className="p-8 space-y-4">
                    <p className="text-sm text-rose-800/70 leading-relaxed font-medium">
                      Estás a punto de cancelar tu <strong>Plan {workspace.plan}</strong>. Perderás el acceso a tus agentes inteligentes y automatizaciones al finalizar el periodo actual.
                    </p>
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                      <Info className="size-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-700 font-bold leading-relaxed">
                        Tus datos y configuraciones se mantendrán guardados por 30 días, pero tus agentes dejarán de responder mensajes.
                      </p>
                    </div>
                 </div>
                 <DialogFooter className="p-8 pt-0 flex flex-col gap-3">
                    <Button 
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-widest h-12 rounded-2xl shadow-xl shadow-rose-500/20"
                      onClick={() => {
                        setIsCancelDialogOpen(false);
                        toast.promise(cancelarSuscripcionMP(currentWorkspaceId!), {
                          loading: 'Cancelando suscripción...',
                          success: 'Suscripción cancelada correctamente',
                          error: 'Error al cancelar'
                        });
                      }}
                    >
                      Sí, confirmar cancelación
                    </Button>
                    <Button 
                      variant="ghost"
                      onClick={() => setIsCancelDialogOpen(false)}
                      className="w-full text-slate-400 font-bold text-[10px] uppercase tracking-widest h-12 rounded-2xl"
                    >
                      No, mantener mi plan
                    </Button>
                 </DialogFooter>
               </DialogContent>
             </Dialog>
          </CardFooter>

          <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
             <DialogContent className="max-w-md bg-white border-none shadow-2xl rounded-[32px] overflow-hidden p-0">
               <DialogHeader className="bg-slate-50/50 p-8 pb-4">
                 <div className="size-16 rounded-[2rem] bg-[var(--accent)] flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-[var(--accent)]/20">
                    <Zap className="size-8" />
                 </div>
                 <DialogTitle className="text-2xl font-black text-[var(--text-primary-light)] text-center tracking-tight">¡Preparate para el cambio!</DialogTitle>
                 <DialogDescription className="text-center text-[var(--text-secondary-light)] text-sm leading-relaxed px-2 font-medium">
                   Tu nuevo plan <strong>{targetPlan?.toUpperCase()}</strong> se activará ahora mismo y tendrás acceso inmediato.
                 </DialogDescription>
               </DialogHeader>

               <div className="p-8 pt-4 space-y-6">
                 <div className="bg-slate-900 rounded-[2rem] p-6 space-y-4 shadow-2xl">
                    <div className="flex justify-between items-center pb-4 border-b border-white/10">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Próximo Cobro</span>
                      <span className="text-sm font-black text-[var(--accent)]">{nextBillingDate()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Monto Estimado</span>
                      <div className="text-right">
                        <p className="text-xl font-black text-white">${targetPlan ? (isAnual ? PLAN_LIMITS[targetPlan].priceYearly : PLAN_LIMITS[targetPlan].priceMonthly) : 0} <span className="text-xs text-white/40 uppercase tracking-widest">USD</span></p>
                        <p className="text-[9px] font-black text-[var(--accent)] uppercase tracking-widest">Ciclo {isAnual ? 'Anual' : 'Mensual'}</p>
                      </div>
                    </div>
                 </div>

                 <div className="flex flex-col gap-3 pt-2">
                   <Button 
                     className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-black text-[10px] uppercase tracking-widest h-12 rounded-2xl shadow-xl shadow-[var(--accent)]/20"
                     onClick={confirmUpgrade}
                   >
                     Confirmar y pagar ahora
                   </Button>
                   <Button 
                     variant="ghost" 
                     className="w-full text-slate-400 font-bold text-[10px] uppercase tracking-widest"
                     onClick={() => setIsUpgradeDialogOpen(false)}
                   >
                     Volver atrás
                   </Button>
                 </div>
               </div>
             </DialogContent>
            </Dialog>
        </Card>

        {/* COMPARADOR DE PLANES */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-xl font-bold text-[var(--text-primary-light)] tracking-tight">Mejorar Nivel de IA</h3>
            <div className="flex items-center gap-2 p-1 bg-white border border-[var(--border-light)] rounded-2xl shadow-sm">
               <button 
                 onClick={() => setIsAnual(false)}
                 className={cn(
                   "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", 
                   !isAnual ? "bg-[var(--accent)] text-[var(--accent-text)] shadow-lg shadow-[var(--accent)]/20" : "text-[var(--text-tertiary-light)] hover:text-[var(--text-primary-light)]"
                 )}
               >Mensual</button>
               <button 
                  onClick={() => setIsAnual(true)}
                  className={cn(
                    "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2", 
                    isAnual ? "bg-[var(--accent)] text-[var(--accent-text)] shadow-lg shadow-[var(--accent)]/20" : "text-[var(--text-tertiary-light)] hover:text-[var(--text-primary-light)]"
                  )}
               >
                 Anual 
                 <Badge className="bg-emerald-50 text-emerald-600 border-none px-2 py-0.5 text-[9px] font-black rounded-lg">-20%</Badge>
               </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['starter', 'pro', 'agencia'] as const).map((p) => {
              const limits = PLAN_LIMITS[p];
              const isCurrent = currentPlan === p;
              const priceMonthly = isAnual ? limits.priceYearly : limits.priceMonthly;

              return (
                <Card key={p} className={cn(
                  "relative flex flex-col bg-white border-[var(--border-light)] rounded-[28px] transition-all",
                  isCurrent ? "ring-2 ring-[var(--accent)] shadow-2xl z-10" : "hover:border-[var(--accent)]/30 hover:shadow-lg"
                )}>
                  {isCurrent && (
                    <div className="absolute top-0 right-0">
                      <div className="bg-[var(--accent)] text-[var(--accent-text)] text-[8px] font-black uppercase px-4 py-1.5 rounded-bl-2xl shadow-lg tracking-widest">Activo</div>
                    </div>
                  )}
                  <CardHeader className="text-center p-8 space-y-2">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-[var(--text-primary-light)]">{p}</CardTitle>
                    <div className="flex flex-col items-center pt-2">
                       {p === 'pro' && !isCurrent && (
                        <div className="flex flex-col items-center mb-2">
                           <Badge className="bg-emerald-500 text-white border-none text-[8px] font-black uppercase px-3 py-1 rounded-full shadow-lg shadow-emerald-500/20 tracking-widest">Recomendado</Badge>
                        </div>
                      )}
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-[var(--text-primary-light)]">${priceMonthly}</span>
                        <span className="text-[10px] font-bold text-[var(--text-tertiary-light)] uppercase tracking-widest">USD</span>
                      </div>
                      <span className="text-[9px] font-bold text-[var(--text-tertiary-light)] uppercase tracking-widest mt-1">Facturación {isAnual ? 'Anual' : 'Mensual'}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-grow px-6 pb-6 border-t border-slate-50 pt-4 space-y-3">
                    {(() => {
                      const display = PLAN_DISPLAY[p];
                      return (
                        <>
                          {display.inheritsFrom && (
                            <div className="flex items-center gap-2 py-2 px-3 bg-emerald-50/70 rounded-xl border border-emerald-100">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                                Todo el {display.inheritsFrom}, más:
                              </span>
                            </div>
                          )}
                          {display.groups.map((group, gi) => (
                            <div key={gi} className="space-y-1.5">
                              <p className={cn(
                                "text-[9px] font-black uppercase tracking-widest px-1 pt-0.5",
                                group.locked ? "text-slate-300" : "text-[var(--text-tertiary-light)]"
                              )}>
                                {group.label}
                              </p>
                              {group.items.map((item, ii) => (
                                <div key={ii} className="flex items-center justify-between min-h-[22px]">
                                  <div className={cn(
                                    "flex items-center gap-2 text-[11px] font-bold",
                                    group.locked ? "text-slate-300" : "text-[var(--text-secondary-light)]"
                                  )}>
                                    {group.locked ? (
                                      <div className="w-4 h-4 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                                        <X className="size-2.5 text-slate-300" />
                                      </div>
                                    ) : (
                                      <div className="w-4 h-4 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                        <Check className="size-2.5 text-emerald-600" />
                                      </div>
                                    )}
                                    <span className={group.locked ? "line-through decoration-slate-200 decoration-1" : ""}>
                                      {item.text}
                                    </span>
                                  </div>
                                  {item.tooltip && !group.locked && <InfoTooltip text={item.tooltip} />}
                                </div>
                              ))}
                            </div>
                          ))}
                        </>
                      );
                    })()}
                  </CardContent>

                  <CardFooter className="p-8 pt-0">
                    <Button 
                      disabled={isCurrent || loadingAction === p}
                      className={cn(
                        "w-full h-11 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all",
                        isCurrent 
                          ? "bg-slate-100 text-slate-400 cursor-default" 
                          : "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] shadow-xl shadow-[var(--accent)]/10 hover:scale-[1.02]"
                      )}
                      onClick={() => workspace.estado === 'prueba' ? handleCreateSubscription(p) : handleUpgrade(p)}
                    >
                      {loadingAction === p ? <Loader2 className="size-4 animate-spin" /> : (isCurrent ? 'Plan Actual' : (workspace.estado === 'prueba' ? 'Suscribirse' : 'Cambiar Plan'))}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* HISTORIAL DE PAGOS */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-[var(--border-light)] flex items-center justify-center shadow-sm">
              <History className="size-5 text-[var(--text-secondary-light)]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[var(--text-primary-light)] tracking-tight">Historial de Pagos</h3>
              <p className="text-xs text-[var(--text-tertiary-light)] font-medium">Registro de tus transacciones y facturas.</p>
            </div>
          </div>
        </div>

        <Card className="bg-white border border-[var(--border-light)] rounded-[32px] overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-[var(--border-light)] hover:bg-transparent">
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 pl-8">Fecha</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-14">Concepto</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-14">Monto ARS</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-14">USD</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-center">Estado</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-right pr-8">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                   <TableCell colSpan={6} className="h-40 text-center text-xs text-[var(--text-tertiary-light)] font-medium">
                     <div className="flex flex-col items-center gap-2 opacity-40">
                        <History className="size-8 mb-2" />
                        Aún no tienes movimientos registrados.
                     </div>
                   </TableCell>
                </TableRow>
              ) : (
                history.map((event) => (
                  <TableRow key={event.id} className="border-b border-[var(--border-light)] hover:bg-slate-50/50 transition-colors">
                    <TableCell className="text-xs font-bold text-[var(--text-secondary-light)] pl-8">
                      {event.creadoEl?.toDate().toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-[var(--text-primary-light)]">
                      {event.descripcion}
                    </TableCell>
                    <TableCell className="text-xs font-black text-[var(--text-primary-light)]">
                      ${event.monto?.toLocaleString('es-AR') || "-"}
                    </TableCell>
                    <TableCell className="text-[10px] font-bold text-[var(--text-tertiary-light)]">
                      ${event.montoUSD?.toLocaleString() || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                       <Badge className={cn(
                         "rounded-xl px-3 py-1 text-[9px] font-black uppercase tracking-widest border",
                         event.tipo === 'pago_exitoso' || event.tipo === 'upgrade' 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                          : "bg-rose-50 text-rose-600 border-rose-100"
                       )}>
                         {event.tipo === 'pago_exitoso' ? 'Pagado' : (event.tipo.startsWith('pago_fallido') ? 'Fallo' : 'Ajuste')}
                       </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      {event.mpPagoId ? (
                        <a 
                          href={`https://www.mercadopago.com.ar/activities?query=${event.mpPagoId}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-input)] text-[10px] font-black text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-all uppercase tracking-widest"
                        >
                          Ver Pago
                          <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">S/D</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* FOOTER INFO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-10 bg-slate-900 border border-white/5 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/10 blur-[100px] rounded-full -mr-32 -mt-32" />
        
        <div className="space-y-4 relative z-10">
          <div className="size-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <ShieldCheck className="size-6 text-emerald-400" />
          </div>
          <h4 className="text-xl font-bold text-white tracking-tight">Pagos 100% Seguros</h4>
          <p className="text-[13px] text-white/60 leading-relaxed font-medium max-w-sm">
            Procesamos tus pagos a través de **MercadoPago**. No almacenamos datos de tus tarjetas, garantizando máxima seguridad con estándares PCI DSS.
          </p>
        </div>
        <div className="space-y-4 relative z-10">
          <div className="size-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Clock className="size-6 text-blue-400" />
          </div>
          <h4 className="text-xl font-bold text-white tracking-tight">Renovación Inteligente</h4>
          <p className="text-[13px] text-white/60 leading-relaxed font-medium max-w-sm">
            Tu plan se renueva automáticamente para evitar interrupciones. Puedes cancelar o cambiar de nivel en cualquier momento desde este panel.
          </p>
        </div>
      </div>
    </div>
  );
}


function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });

  const handleEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 8,
        left: Math.min(rect.left - 200, window.innerWidth - 280),
      });
    }
    setShow(true);
  };

  return (
    <div ref={ref} className="relative inline-flex shrink-0" onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)}>
      <HelpCircle className="size-3.5 text-[var(--text-tertiary-light)] cursor-help hover:text-[var(--accent)] transition-colors" />
      {show && (
        <div
          className="fixed w-60 p-3.5 bg-[#1F1F1E] text-white text-[11px] rounded-2xl shadow-2xl z-[9999] border border-white/10 leading-relaxed font-semibold pointer-events-none"
          style={{ top: pos.top, left: pos.left }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg 
      className={cn("animate-spin", className)} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}
