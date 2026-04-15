"use client";

import React, { useState, useEffect } from "react";
import { 
  CreditCard, 
  Check, 
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
  HelpCircle
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

export default function FacturacionPage() {
  const { workspace, currentWorkspaceId } = useWorkspaceStore();
  const [history, setHistory] = useState<(EventoFacturacion & { id: string })[]>([]);
  const [isAnual, setIsAnual] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [cotizacion, setCotizacion] = useState<number | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [targetPlan, setTargetPlan] = useState<'starter' | 'pro' | 'agencia' | null>(null);
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);

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
    prueba: { label: "En Prueba", color: "bg-amber-400/20 text-amber-500 border-amber-500/30" },
    activo: { label: "Activo", color: "bg-emerald-400/20 text-emerald-500 border-emerald-500/30" },
    pago_vencido: { label: "Pago Vencido", color: "bg-rose-400/20 text-rose-500 border-rose-500/30" },
    cancelado: { label: "Cancelado", color: "bg-slate-400/20 text-slate-500 border-slate-500/30" },
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[var(--accent)]">
            <CreditCard className="w-5 h-5" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Billing & Plans</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary-light)] tracking-tight">Facturación y Gestión de Plan</h1>
          <p className="text-[13px] text-[var(--text-secondary-light)] max-w-md leading-relaxed font-medium">
            Controla tus suscripciones, historial de pagos y límites operativos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SECCIÓN 1: ESTADO ACTUAL */}
        <Card className="lg:col-span-1 bg-[var(--bg-card)] border border-[var(--accent)]/20 rounded-2xl shadow-sm overflow-hidden p-6">
          <CardHeader className="p-0 pb-4 border-b border-[var(--border-light)] bg-transparent">
            <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary-light)]">Tu Plan Actual</CardTitle>
          </CardHeader>
          <CardContent className="pt-8 space-y-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="size-16 rounded-3xl bg-[var(--accent)]/10 flex items-center justify-center border border-[var(--accent)]/20 shadow-inner">
                <Zap className="size-8 text-[var(--accent)]" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-[var(--text-primary-light)] uppercase tracking-tight">Plan {workspace.plan}</h3>
                <Badge className={cn("mt-2 rounded-full px-4 py-1 border font-bold text-[11px]", statusLabels[workspace.estado].color)}>
                  {statusLabels[workspace.estado].label}
                </Badge>
              </div>
            </div>

            {workspace.estado === 'prueba' && (
              <div className="space-y-4 p-5 bg-[var(--bg-main)]/50 rounded-2xl border border-[var(--border-light)] shadow-inner">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-[var(--text-tertiary-light)] font-bold uppercase tracking-widest">Período de Prueba</span>
                  <span className="text-[#F59E0B] font-bold text-sm">{diasRestantes} días restantes</span>
                </div>
                <Progress value={porcentajePrueba} className="h-2 bg-[var(--border-light)] [&>div]:bg-[var(--accent)]" />
                <p className="text-[10px] text-[var(--text-tertiary-light)] leading-relaxed font-medium">
                  Tu acceso de cortesía vence el {workspace.pruebaTerminaEl?.toDate().toLocaleDateString()}. Suscribite para mantener tus agentes activos.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-[var(--border-light)]">
                <span className="text-xs font-bold text-[var(--text-tertiary-light)]">Precio ARS</span>
                <span className="text-sm font-black text-[var(--text-primary-light)]">
                  {cotizacion && (workspace.facturacion?.precioUSD || PLAN_LIMITS[workspace.plan as keyof typeof PLAN_LIMITS]?.priceMonthly)
                    ? `$${Math.round((workspace.facturacion?.precioUSD || PLAN_LIMITS[workspace.plan as keyof typeof PLAN_LIMITS].priceMonthly) * cotizacion * 1.10).toLocaleString('es-AR')} / mes` 
                    : 'Calculando...'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[var(--border-light)]">
                <span className="text-xs font-bold text-[var(--text-tertiary-light)]">Cotización Blue</span>
                <span className="text-xs font-bold text-[var(--text-secondary-light)] tracking-tight">
                  {cotizacion ? `$${cotizacion.toLocaleString('es-AR')} ARS` : 'Cargando...'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs font-bold text-[var(--text-tertiary-light)]">Próxima Renovación</span>
                <span className="text-xs font-black text-[var(--text-primary-light)]">
                  {workspace.periodoVigenteHasta?.toDate().toLocaleDateString() || "N/A"}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
              <Info className="size-4 text-[var(--text-primary-light)] shrink-0 mt-0.5" />
              <p className="text-[10px] text-[var(--text-primary-light)] leading-relaxed font-bold">
                Los precios en ARS se ajustan trimestralmente basándose en el Dólar Blue para mantener la paridad operativa. La conversión incluye un spread operativo y gastos administrativos. Próximo ajuste: <strong className="font-black underline cursor-help decoration-[var(--accent)] decoration-2">{workspace.facturacion?.proximaActualizacion?.toDate().toLocaleDateString()}</strong>.
              </p>
            </div>
          </CardContent>
          <CardFooter className="bg-[#1F1F1E] border-t border-white/5 p-4 flex justify-center items-center">
             <Button 
               variant="ghost" 
               className="text-[11px] font-bold text-rose-400 hover:text-rose-300 hover:bg-white/5 transition-all px-8" 
               onClick={() => setIsCancelDialogOpen(true)}
             >
               {workspace.estado === 'cancelado' ? "Suscripción ya cancelada" : "Cancelar suscripción"}
             </Button>

             <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
               <DialogContent className="max-w-md bg-[var(--bg-card)] border-[var(--border-light)]">
                 <DialogHeader>
                   <DialogTitle className="text-xl font-black text-[var(--text-primary-light)]">¿Confirmar Cancelación?</DialogTitle>
                   <DialogDescription className="text-sm text-[var(--text-tertiary-light)] pt-2 leading-relaxed">
                     Estás a punto de cancelar tu suscripción a <strong>Plan {workspace.plan}</strong>. Perderás el acceso a tus agentes inteligentes y automatizaciones al finalizar el periodo actual.
                   </DialogDescription>
                 </DialogHeader>
                 <DialogFooter className="bg-transparent border-t-0 -mx-0 -mb-0 pt-6 gap-3">
                   <Button 
                    variant="outline" 
                    onClick={() => setIsCancelDialogOpen(false)}
                    className="flex-1 rounded-xl border-[var(--border-light)] font-bold text-xs"
                   >
                     Mantener Plan
                   </Button>
                   <Button 
                    className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl"
                    onClick={() => {
                      setIsCancelDialogOpen(false);
                      toast.promise(cancelarSuscripcionMP(currentWorkspaceId!), {
                        loading: 'Cancelando suscripción...',
                        success: 'Suscripción cancelada correctamente',
                        error: 'Error al cancelar'
                      });
                    }}
                   >
                     Confirmar Cancelación
                   </Button>
                 </DialogFooter>
               </DialogContent>
             </Dialog>
          </CardFooter>

          <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
             <DialogContent className="max-w-md bg-[var(--bg-card)] border-[var(--border-light)] p-8">
               <DialogHeader className="space-y-4">
                 <div className="size-16 rounded-3xl bg-[var(--accent)]/10 flex items-center justify-center border border-[var(--accent)]/20 shadow-inner mx-auto mb-2">
                    <Zap className="size-8 text-[var(--accent)]" />
                 </div>
                 <DialogTitle className="text-2xl font-black text-[var(--text-primary-light)] text-center">¡Preparate para el cambio!</DialogTitle>
                 <DialogDescription className="text-center text-[var(--text-secondary-light)] text-sm leading-relaxed px-2">
                   Tu nuevo plan <strong>{targetPlan?.toUpperCase()}</strong> se activará ahora mismo y tendrás acceso inmediato a todas sus funcionalidades.
                 </DialogDescription>
               </DialogHeader>

               <div className="mt-8 p-6 bg-[#1F1F1E] rounded-3xl border border-white/5 space-y-4 shadow-2xl">
                  <div className="flex justify-between items-center pb-4 border-b border-white/10">
                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Próximo Cobro</span>
                    <span className="text-sm font-black text-[var(--accent)]">{nextBillingDate()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Monto Estimado</span>
                    <div className="text-right">
                      <p className="text-sm font-black text-white">${targetPlan ? (isAnual ? PLAN_LIMITS[targetPlan].priceYearly : PLAN_LIMITS[targetPlan].priceMonthly) : 0} USD</p>
                      <p className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">Equivalente en ARS</p>
                    </div>
                  </div>
               </div>

               <DialogFooter className="mt-8 flex flex-col gap-3">
                 <Button 
                   className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-black text-xs uppercase tracking-widest h-12 rounded-2xl shadow-lg shadow-[var(--accent)]/20"
                   onClick={confirmUpgrade}
                 >
                   Confirmar y pagar ahora
                 </Button>
                 <Button 
                   variant="outline" 
                   className="w-full text-[var(--text-tertiary-light)] font-bold text-[10px] uppercase tracking-widest border-[var(--border-light)]"
                   onClick={() => setIsUpgradeDialogOpen(false)}
                 >
                   Volver
                 </Button>
               </DialogFooter>
             </DialogContent>
           </Dialog>
        </Card>

        {/* COMPARADOR DE PLANES */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold text-[var(--text-primary-light)] tracking-tight">Mejorar Nivel de IA</h3>
            <div className="flex items-center gap-3 p-1 bg-[var(--bg-input)] border border-[var(--border-light)] rounded-xl">
               <button 
                 onClick={() => setIsAnual(false)}
                 className={cn("px-4 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all", !isAnual ? "bg-[var(--accent)] text-[var(--accent-text)] shadow-lg" : "text-[var(--text-tertiary-light)]")}
               >Mensual</button>
               <button 
                  onClick={() => setIsAnual(true)}
                  className={cn("px-4 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all flex items-center gap-2", isAnual ? "bg-[var(--accent)] text-[var(--accent-text)] shadow-lg" : "text-[var(--text-tertiary-light)]")}
               >
                 Anual 
                 <Badge className="bg-[#22C55E]/15 text-[#22C55E] border-none h-5 px-2 py-0.5 text-[9px] font-black rounded-full">-20% — 2 meses gratis</Badge>
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
                  "relative flex flex-col bg-[var(--bg-card)] border-[var(--border-light)] transition-all",
                  isCurrent ? "ring-2 ring-[var(--accent)] border-transparent scale-[1.02] shadow-2xl z-10" : "hover:border-[var(--accent)]/30"
                )}>
                  {isCurrent && (
                    <div className="absolute top-0 right-0">
                      <div className="bg-[var(--accent)] text-[var(--accent-text)] text-[8px] font-black uppercase px-3 py-1 rounded-bl-xl shadow-lg">Actual</div>
                    </div>
                  )}
                  <CardHeader className="text-center p-6 space-y-1">
                    <CardTitle className="text-lg font-black uppercase tracking-widest text-[var(--text-primary-light)]">{p}</CardTitle>
                    <p className="text-[10px] text-[var(--text-tertiary-light)] font-bold italic">
                      {p === 'starter' && "Ideal para el agente que empieza con IA"}
                      {p === 'pro' && "Para equipos activos con volumen"}
                      {p === 'agencia' && "Para equipos grandes y redes de oficinas"}
                    </p>
                    <div className="flex flex-col items-center pt-2">
                       {p === 'pro' && !isCurrent && (
                        <div className="flex flex-col items-center animate-bounce-subtle">
                           <Badge className="mb-1 bg-[#22C55E] text-white border-none text-[8px] font-black uppercase px-3 shadow-lg shadow-emerald-500/20">Más Popular</Badge>
                           <div className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter mb-1">Recomendado</div>
                        </div>
                      )}
                      <div className="text-3xl font-black text-[var(--text-primary-light)]">${priceMonthly}</div>
                      <span className="text-[10px] font-bold text-[var(--text-tertiary-light)] uppercase tracking-widest">USD / MES</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow p-6 space-y-4 border-t border-[var(--border-light)]/50">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-[var(--text-secondary-light)]">
                        <Check className="size-3.5 text-emerald-500" />
                        {limits.agentsIA} Agente Inteligente
                        <InfoTooltip text="Un experto virtual entrenado con tu información que atiende, vende y agenda citas por vos las 24/7." />
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-bold text-[var(--text-secondary-light)]">
                        <Check className="size-3.5 text-emerald-500" />
                        {limits.convCountIA.toLocaleString()} Conversaciones
                        <InfoTooltip text="Sesiones de chat con clientes. La IA puede intercambiar mensajes ilimitados en una misma sesión." />
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-bold text-[var(--text-secondary-light)]">
                         <Check className="size-3.5 text-emerald-500" />
                         CRM p/ {limits.crmContacts === 'unlimited' ? 'Contactos Ilimitados' : limits.crmContacts.toString() + ' contactos'}
                         <InfoTooltip text="Capacidad máxima de clientes únicos guardados en tu base para seguimiento y re-marketing." />
                      </div>
                       <div className="flex items-center gap-2 text-[11px] font-bold text-[var(--text-secondary-light)]">
                         <Check className="size-3.5 text-emerald-500" />
                         Base de Conocimiento
                         <InfoTooltip text="Documentación y archivos (PDF, Webs) que le das a tu IA para que aprenda sobre tu negocio." />
                      </div>
                      {/* Item API eliminado por solicitud */}
                    </div>
                  </CardContent>
                  <CardFooter className="p-6">
                    <Button 
                      disabled={isCurrent || loadingAction === p}
                      className={cn(
                        "w-full h-10 font-bold uppercase text-[10px] tracking-widest rounded-xl transition-all",
                        isCurrent 
                          ? "bg-[var(--bg-input)] text-[var(--text-tertiary-light)] cursor-default" 
                          : "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] shadow-lg"
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
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-light)] flex items-center justify-center">
            <History className="size-5 text-[var(--text-secondary-light)]" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-[var(--text-primary-light)] tracking-tight">Historial de Pagos</h3>
            <p className="text-xs text-[var(--text-tertiary-light)] font-medium">Registro de todas las facturas y transacciones realizadas.</p>
          </div>
        </div>

        <Card className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-3xl overflow-hidden shadow-xl shadow-black/5">
          <Table>
            <TableHeader className="bg-[var(--bg-main)]/50">
              <TableRow className="border-b border-[var(--border-light)] hover:bg-transparent">
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-12">Fecha</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-12">Concepto</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-12">Monto ARS</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-12">Monto USD</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-12 text-center">Estado</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-12 text-right">Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                   <TableCell colSpan={6} className="h-32 text-center text-xs text-[var(--text-tertiary-light)] font-medium bg-[var(--bg-card)]">
                     Aún no tienes movimientos registrados en tu historial.
                   </TableCell>
                </TableRow>
              ) : (
                history.map((event) => (
                  <TableRow key={event.id} className="border-b border-[var(--border-light)] hover:bg-[var(--bg-main)]/30 transition-colors">
                    <TableCell className="text-xs font-bold text-[var(--text-secondary-light)]">
                      {event.creadoEl?.toDate().toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs font-black text-[var(--text-primary-light)]">
                      {event.descripcion}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-[var(--text-secondary-light)]">
                      ${event.monto?.toLocaleString('es-AR') || "-"}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-[var(--text-secondary-light)]">
                      ${event.montoUSD?.toLocaleString() || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                       <Badge className={cn(
                         "rounded-full px-3 py-0.5 text-[10px] font-bold border",
                         event.tipo === 'pago_exitoso' || event.tipo === 'upgrade' 
                          ? "bg-emerald-400/10 text-emerald-500 border-emerald-500/20" 
                          : "bg-rose-400/10 text-rose-500 border-rose-500/20"
                       )}>
                         {event.tipo === 'pago_exitoso' ? 'Pagado' : (event.tipo.startsWith('pago_fallido') ? 'Fallo' : 'Ajuste')}
                       </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {event.mpPagoId ? (
                        <a 
                          href={`https://www.mercadopago.com.ar/activities?query=${event.mpPagoId}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-[10px] font-black text-[var(--accent)] hover:underline"
                        >
                          Comprobante MP
                          <ExternalLink className="size-3" />
                        </a>
                      ) : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* FOOTER INFO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 bg-[#1F1F1E] border border-white/5 rounded-[2.5rem] shadow-2xl">
        <div className="space-y-4">
          <div className="size-10 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
            <ShieldCheck className="size-5 text-[var(--accent)]" />
          </div>
          <h4 className="text-lg font-bold text-white">Pagos 100% Protegidos</h4>
          <p className="text-xs text-white/70 leading-relaxed font-medium">
            Todas las transacciones son procesadas de forma segura a través de **MercadoPago**. Imalá Vox no almacena directamente los datos de tus tarjetas de crédito, garantizando la máxima seguridad posible certificados por estándares internacionales PCI DSS.
          </p>
        </div>
        <div className="space-y-4">
          <div className="size-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Clock className="size-5 text-blue-400" />
          </div>
          <h4 className="text-lg font-bold text-white">Renovación Automática</h4>
          <p className="text-xs text-white/70 leading-relaxed font-medium">
            Tu plan se renovará automáticamente al final de cada ciclo para que no pierdas conexión con tus clientes. Puedes cancelar o cambiar de plan en cualquier momento desde este panel. Los cambios de plan se aplican de forma inmediata.
          </p>
        </div>
      </div>
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
