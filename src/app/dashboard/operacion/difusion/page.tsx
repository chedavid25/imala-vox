"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Megaphone, 
  Plus, 
  MessageSquare, 
  Activity, 
  Search,
  MoreVertical,
  LayoutGrid,
  Zap,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  ChevronRight,
  ShieldCheck,
  Send,
  History,
  Clock,
  Eye,
  Trash2,
  RefreshCw,
  Info,
  ChevronLeft,
  Type,
  Phone,
  MousePointer2,
  Instagram,
  Hash,
  Users,
  Rocket,
  Settings,
  HelpCircle,
  Lightbulb,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Command,
  Loader2,
  PlayCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, Timestamp } from "firebase/firestore";
import { despacharCampaña, cancelarCampaña } from "@/app/actions/difusion";
import { db } from "@/lib/firebase";
import { COLLECTIONS, PlantillaMeta, CampañaDifusion, DisparadorAuto, EtiquetaCRM, Contacto, Canal } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { PlanGate } from "@/components/layout/PlanGate";


export default function DifusionPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState("campanas");
  const [loading, setLoading] = useState(true);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [isCreatingTrigger, setIsCreatingTrigger] = useState(false);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [campaignStep, setCampaignStep] = useState(1);
  const [showHelp, setShowHelp] = useState<string | null>(null);
  const templateBodyRef = React.useRef<HTMLTextAreaElement>(null);

  // Estados de datos
  const [plantillas, setPlantillas] = useState<(PlantillaMeta & { id: string })[]>([]);
  const [campanas, setCampanas] = useState<(CampañaDifusion & { id: string })[]>([]);
  const [disparadores, setDisparadores] = useState<(DisparadorAuto & { id: string })[]>([]);
  const [etiquetas, setEtiquetas] = useState<(EtiquetaCRM & { id: string })[]>([]);
  const [contactos, setContactos] = useState<(Contacto & { id: string })[]>([]);

  // Estado para nueva campaña (Wizard)
  const [newCampaign, setNewCampaign] = useState({
    nombre: "",
    etiquetasSeleccionadas: [] as string[],
    plantillaId: "",
    programar: false,
    fecha: format(new Date(), "yyyy-MM-dd"),
    hora: "09:00"
  });

  // Estado para nueva plantilla
  const [newTemplate, setNewTemplate] = useState({
    nombre: "",
    categoria: "MARKETING" as any,
    idioma: "es_AR",
    header: { type: "NONE", text: "" },
    body: "Hola {{1}}! Te escribimos de Imalá Vox para...",
    footer: "Respondé SALIR para no recibir más mensajes.",
    buttons: [] as any[]
  });

  // Estado para nuevo disparador
  const [canalesIG, setCanalesIG] = useState<(Canal & { id: string })[]>([]);
  const [newTrigger, setNewTrigger] = useState({
    nombre: "",
    tipo: "instagram_comment",
    canalId: "",
    palabraClave: "",
    respuestaPublica: "¡Hola! Te enviamos la info por mensaje privado 📩",
    respuestaDM: "¡Hola! Gracias por tu interés. Aquí tienes la información que solicitaste...",
    activo: true
  });

  // 1. Suscripciones a Firestore
  useEffect(() => {
    if (!currentWorkspaceId) return;

    const unsubPlantillas = onSnapshot(
      query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.PLANTILLAS_META), orderBy("creadoEl", "desc")),
      (snap) => setPlantillas(snap.docs.map(d => ({ ...d.data(), id: d.id })) as any)
    );

    const unsubCampanas = onSnapshot(
      query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.DIFUSIONES), orderBy("creadoEl", "desc")),
      (snap) => {
        setCampanas(snap.docs.map(d => ({ ...d.data(), id: d.id })) as any);
        setLoading(false);
      }
    );

    const unsubTriggers = onSnapshot(
      query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AUTODISPARADORES), orderBy("creadoEl", "desc")),
      (snap) => setDisparadores(snap.docs.map(d => ({ ...d.data(), id: d.id })) as any)
    );

    const unsubEtiquetas = onSnapshot(
      query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.ETIQUETAS_CRM), orderBy("nombre", "asc")),
      (snap) => setEtiquetas(snap.docs.map(d => ({ ...d.data(), id: d.id })) as any)
    );

    const unsubContactos = onSnapshot(
      query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS)),
      (snap) => setContactos(snap.docs.map(d => ({ ...d.data(), id: d.id })) as any)
    );

    const unsubCanalesIG = onSnapshot(
      query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CANALES)),
      (snap) => setCanalesIG(
        snap.docs
          .map(d => ({ ...d.data(), id: d.id }) as Canal & { id: string })
          .filter(c => c.tipo === 'instagram' && c.status === 'connected')
      )
    );

    return () => {
      unsubPlantillas();
      unsubCampanas();
      unsubTriggers();
      unsubEtiquetas();
      unsubContactos();
      unsubCanalesIG();
    };
  }, [currentWorkspaceId]);

  // Cálculo de audiencia filtrada
  const filteredAudience = useMemo(() => {
    if (newCampaign.etiquetasSeleccionadas.length === 0) return contactos.length;
    return contactos.filter(c => 
      c.etiquetas?.some(tagId => newCampaign.etiquetasSeleccionadas.includes(tagId))
    ).length;
  }, [contactos, newCampaign.etiquetasSeleccionadas]);

  const handleCreateCampaign = async () => {
    if (!newCampaign.nombre || !newCampaign.plantillaId) {
      toast.error("Completa el nombre y selecciona una plantilla");
      return;
    }
    try {
      await addDoc(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId!, COLLECTIONS.DIFUSIONES), {
        nombre: newCampaign.nombre,
        plantillaId: newCampaign.plantillaId,
        filtroEtiquetas: newCampaign.etiquetasSeleccionadas,
        estado: 'programada',
        estadisticas: { total: filteredAudience, enviados: 0, entregados: 0, leidos: 0, respondidos: 0, fallidos: 0 },
        programadaPara: newCampaign.programar ? Timestamp.fromDate(new Date(`${newCampaign.fecha}T${newCampaign.hora}`)) : serverTimestamp(),
        creadoEl: serverTimestamp(),
        actualizadoEl: serverTimestamp()
      });
      toast.success("Campaña creada y programada con éxito");
      setIsCreatingCampaign(false);
      setCampaignStep(1);
    } catch (e) { toast.error("Error al crear la campaña"); }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.nombre || !newTemplate.body) {
      toast.error("El nombre y el cuerpo del mensaje son obligatorios");
      return;
    }
    try {
      const componentes = [];
      if (newTemplate.header.type !== 'NONE') componentes.push({ type: 'HEADER', format: newTemplate.header.type, text: newTemplate.header.text });
      componentes.push({ type: 'BODY', text: newTemplate.body });
      componentes.push({ type: 'FOOTER', text: "Respondé SALIR para no recibir más mensajes." });
      if (newTemplate.buttons.length > 0) componentes.push({ type: 'BUTTONS', buttons: newTemplate.buttons });

      await addDoc(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId!, COLLECTIONS.PLANTILLAS_META), {
        nombre: newTemplate.nombre.toLowerCase().replace(/\s+/g, '_'),
        categoria: newTemplate.categoria,
        idioma: newTemplate.idioma,
        estado: 'PENDING',
        componentes,
        variables: newTemplate.body.match(/\{\{\d+\}\}/g) || [],
        metaTemplateId: '',
        creadoEl: serverTimestamp(),
        actualizadoEl: serverTimestamp()
      });
      toast.success("Plantilla enviada correctamente.");
      setIsCreatingTemplate(false);
    } catch (e) { toast.error("Error al guardar la plantilla"); }
  };

  const handleCreateTrigger = async () => {
    if (!newTrigger.nombre || !newTrigger.palabraClave || !newTrigger.respuestaDM) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }
    try {
      await addDoc(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId!, COLLECTIONS.AUTODISPARADORES), {
        nombre: newTrigger.nombre,
        tipo: newTrigger.tipo,
        activo: newTrigger.activo,
        config: {
          palabraClave: newTrigger.palabraClave.toUpperCase(),
          canalId: newTrigger.canalId || null,
          respuestaPublica: newTrigger.respuestaPublica,
          respuestaDM: newTrigger.respuestaDM,
          aplicarATodosPosts: true
        },
        creadoEl: serverTimestamp(),
        actualizadoEl: serverTimestamp()
      });
      toast.success("Disparador configurado correctamente");
      setIsCreatingTrigger(false);
    } catch (e) { toast.error("Error al crear el disparador"); }
  };

  const toggleTrigger = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId!, COLLECTIONS.AUTODISPARADORES, id), {
        activo: !currentStatus,
        actualizadoEl: serverTimestamp()
      });
    } catch (e) { toast.error("Error al actualizar estado"); }
  };

  const deleteTrigger = async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId!, COLLECTIONS.AUTODISPARADORES, id));
      toast.success("Disparador eliminado");
    } catch (e) { toast.error("Error al eliminar"); }
  };

  const insertVariable = (tag: string) => {
    const el = templateBodyRef.current;
    if (!el) return;
    const start = el.selectionStart ?? newTemplate.body.length;
    const end = el.selectionEnd ?? newTemplate.body.length;
    const newBody = newTemplate.body.slice(0, start) + tag + newTemplate.body.slice(end);
    setNewTemplate(prev => ({ ...prev, body: newBody }));
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  // Contenido de ayuda
  const helpContent: Record<string, { titulo: string; descripcion: string; items: { titulo: string; detalle: string }[] }> = {
    general: {
      titulo: "Manual de Difusión y Marketing",
      descripcion: "Gestiona campañas masivas y automatizaciones inteligentes respetando las políticas de Meta.",
      items: [
        { titulo: "Campañas", detalle: "Envía mensajes masivos filtrando por etiquetas del CRM." },
        { titulo: "Plantillas", detalle: "Usa solo contenido aprobado por Meta para evitar bloqueos." },
        { titulo: "Automatización", detalle: "Responde comentarios de Instagram automáticamente." }
      ]
    },
    campanas: {
      titulo: "Gestión de Campañas",
      descripcion: "Llega a tu audiencia ideal con mensajes directos a su WhatsApp.",
      items: [
        { titulo: "Audiencia", detalle: "Filtra contactos por sus intereses o etiquetas del CRM." },
        { titulo: "Modo Goteo", detalle: "Envío seguro en intervalos para proteger tu número." },
        { titulo: "Programación", detalle: "Define el día y la hora exacta para el lanzamiento." }
      ]
    },
    plantillas: {
      titulo: "Plantillas de Meta",
      descripcion: "El contenido de tus campañas debe ser revisado y aprobado por Meta.",
      items: [
        { titulo: "Estado", detalle: "Solo puedes usar plantillas con el estado 'Approved'." },
        { titulo: "Variables", detalle: "Usa {{1}} para personalizar con el nombre del cliente." },
        { titulo: "Categorías", detalle: "Marketing (Promociones) o Utility (Avisos de cuenta)." }
      ]
    },
    automatizaciones: {
      titulo: "Instagram Keyword Bot",
      descripcion: "Convierte comentarios en ventas de forma automática.",
      items: [
        { titulo: "Disparador", detalle: "Se activa cuando alguien comenta la palabra clave elegida." },
        { titulo: "Prueba Social", detalle: "Responde el comentario públicamente para generar confianza." },
        { titulo: "Venta Directa", detalle: "Envía un DM privado con la información o link de compra." }
      ]
    },
    salud: {
      titulo: "Salud de la Cuenta",
      descripcion: "Monitorea la reputación de tu número ante WhatsApp.",
      items: [
        { titulo: "Quality Rating", detalle: "Basado en cuántos usuarios te marcan como spam." },
        { titulo: "Tier de Envío", detalle: "A mayor calidad, más mensajes diarios permite Meta." },
        { titulo: "Webhook", detalle: "Estado de la conexión en tiempo real con los servidores." }
      ]
    }
  };

  return (
    <PlanGate
      requiredPlan="pro"
      featureName="Difusión Masiva"
      featureDescription="Enviá campañas de WhatsApp a tu base de contactos segmentada por etiquetas. Ofertas, novedades, recordatorios — con respuestas gestionadas automáticamente por tu agente IA."
    >
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <Megaphone className="w-4 h-4 text-[var(--text-tertiary-light)]" />
            <span className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Operación & Marketing</span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary-light)] tracking-tight">Difusión y Automatización</h1>
          <p className="text-sm text-[var(--text-tertiary-light)] font-medium">Gestiona tus campañas masivas y disparadores inteligentes.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHelp(showHelp === "general" ? null : "general")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all shrink-0 h-11",
              showHelp === "general"
                ? "bg-[var(--bg-sidebar)] border-[var(--border-dark)] text-[var(--accent)] shadow-inner"
                : "bg-white border-[var(--border-light)] text-[var(--text-secondary-light)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary-light)] shadow-sm"
            )}
          >
            <HelpCircle className="w-4 h-4" />
            Guía de Difusión
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showHelp === "general" && "rotate-180")} />
          </button>

          <Dialog open={isCreatingCampaign} onOpenChange={v => { setIsCreatingCampaign(v); if (!v) setCampaignStep(1); }}>
            <DialogTrigger className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] h-11 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Campaña
            </DialogTrigger>
            <DialogContent className="max-w-4xl bg-white border-none rounded-[40px] p-0 overflow-hidden flex flex-col h-[85vh] shadow-2xl">
              {/* Header del wizard */}
              <DialogHeader className="px-10 pt-8 pb-6 border-b border-[var(--border-light)] shrink-0 bg-slate-50/30">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <DialogTitle className="text-xl font-black tracking-tight">Crear Campaña de Difusión</DialogTitle>
                    <DialogDescription className="font-medium">
                      {campaignStep === 1 && "Paso 1 de 3 — Elegí el nombre y la audiencia"}
                      {campaignStep === 2 && "Paso 2 de 3 — Seleccioná la plantilla de mensaje"}
                      {campaignStep === 3 && "Paso 3 de 3 — Programá el envío"}
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3].map(s => (
                      <div key={s} className={cn(
                        "h-2 rounded-full transition-all duration-300",
                        campaignStep >= s ? "bg-[var(--accent)] w-6 shadow-[0_0_8px_rgba(var(--accent-rgb),0.4)]" : "bg-slate-200 w-2"
                      )} />
                    ))}
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto no-scrollbar p-8">

                {/* PASO 1 — Nombre + Etiquetas */}
                {campaignStep === 1 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary-light)] ml-1">Nombre de la campaña</Label>
                      <Input
                        placeholder="Ej: Propiedades para Inversores — Julio 2025"
                        value={newCampaign.nombre}
                        onChange={e => setNewCampaign({...newCampaign, nombre: e.target.value})}
                        className="h-14 rounded-2xl text-sm border-[var(--border-light)] bg-[var(--bg-input)]/50 focus:ring-2 focus:ring-[var(--accent)]/20 transition-all font-bold"
                      />
                      <p className="text-[10px] text-slate-400 pl-1">Este nombre es solo para vos, el cliente no lo ve.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between ml-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary-light)]">
                          ¿A quién le llega? — Elegí las etiquetas
                        </Label>
                        {newCampaign.etiquetasSeleccionadas.length === 0 && (
                          <span className="text-[10px] text-slate-400 font-medium">Sin filtro = llega a todos los contactos</span>
                        )}
                      </div>

                      {etiquetas.length === 0 ? (
                        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center">
                          <p className="text-sm font-bold text-slate-400">Todavía no tenés etiquetas creadas.</p>
                          <p className="text-xs text-slate-400 mt-1">Creá etiquetas en la sección Contactos para poder filtrar tu audiencia.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-3">
                          {etiquetas.map(tag => {
                            const selected = newCampaign.etiquetasSeleccionadas.includes(tag.id!);
                            return (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => {
                                  const current = newCampaign.etiquetasSeleccionadas;
                                  setNewCampaign({...newCampaign, etiquetasSeleccionadas: selected ? current.filter(id => id !== tag.id) : [...current, tag.id!]});
                                }}
                                className={cn(
                                  "p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-3 group shadow-sm",
                                  selected ? "border-transparent shadow-md" : "border-[var(--border-light)] bg-white hover:shadow-md"
                                )}
                                style={selected ? { backgroundColor: tag.colorBg, borderColor: tag.colorBg } : {}}
                              >
                                <div className="w-3 h-3 rounded-full shrink-0 border-2 border-white/50 shadow-sm" style={{ backgroundColor: tag.colorBg }} />
                                <span
                                  className="text-[11px] font-black uppercase truncate flex-1"
                                  style={selected ? { color: tag.colorText } : {}}
                                >{tag.nombre}</span>
                                {selected && <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: tag.colorText }} />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-50 p-6 rounded-[28px] border border-[var(--border-light)] flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-[var(--border-light)] flex items-center justify-center text-[var(--accent)] shadow-sm">
                          <Users className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary-light)]">Contactos que recibirán el mensaje</p>
                          <p className="text-2xl font-black text-[var(--text-primary-light)]">{filteredAudience}</p>
                        </div>
                      </div>
                      {newCampaign.etiquetasSeleccionadas.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 max-w-[200px] justify-end">
                          {newCampaign.etiquetasSeleccionadas.map(id => {
                            const tag = etiquetas.find(e => e.id === id);
                            return tag ? (
                              <span key={id} className="text-[9px] font-black px-2 py-1 rounded-lg" style={{ backgroundColor: tag.colorBg, color: tag.colorText }}>{tag.nombre}</span>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* PASO 2 — Elegir plantilla */}
                {campaignStep === 2 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3">
                      <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                        Elegí el molde del mensaje que le va a llegar a tus contactos. Solo aparecen plantillas aprobadas o en revisión por Meta.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {plantillas.filter(p => p.estado === 'APPROVED' || p.estado === 'PENDING').map(p => {
                        const body = p.componentes.find(c => c.type === 'BODY')?.text || '';
                        const varCount = [...new Set((body.match(/\{\{\d+\}\}/g) || []))].length;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setNewCampaign({...newCampaign, plantillaId: p.id, variableValues: {}})}
                            className={cn(
                              "p-6 rounded-[28px] border-2 text-left transition-all relative group",
                              newCampaign.plantillaId === p.id
                                ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-md"
                                : "border-[var(--border-light)] bg-white hover:border-[var(--accent)]/40 shadow-sm"
                            )}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={cn("text-[9px] font-black px-2 py-0.5 rounded-lg", p.estado === 'APPROVED' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200")}>
                                    {p.estado === 'APPROVED' ? 'Aprobada' : 'En revisión'}
                                  </Badge>
                                  <Badge variant="outline" className="text-[9px] font-black px-2 py-0.5 rounded-lg border-slate-200 text-slate-500">{p.categoria}</Badge>
                                  {varCount > 0 && (
                                    <span className="text-[9px] font-black text-slate-400">{varCount} variable{varCount > 1 ? 's' : ''} a completar</span>
                                  )}
                                </div>
                                <h4 className="font-black text-base text-[var(--text-primary-light)]">{p.nombre}</h4>
                                <p className="text-[12px] text-[var(--text-tertiary-light)] font-medium leading-relaxed italic bg-slate-50 rounded-xl px-4 py-2.5">
                                  "{body || "Sin vista previa"}"
                                </p>
                              </div>
                              {newCampaign.plantillaId === p.id && (
                                <div className="w-8 h-8 rounded-xl bg-[var(--accent)] flex items-center justify-center shrink-0">
                                  <CheckCircle2 className="w-5 h-5 text-black" />
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                      {plantillas.filter(p => p.estado === 'APPROVED' || p.estado === 'PENDING').length === 0 && (
                        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-2">
                          <p className="text-sm font-bold text-slate-400">No tenés plantillas aprobadas todavía.</p>
                          <p className="text-xs text-slate-400">Creá una plantilla en la pestaña "Plantillas Meta" y esperá la aprobación de WhatsApp.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* PASO 3 — Programar envío */}
                {campaignStep === 3 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="flex items-center justify-between p-7 bg-slate-50 rounded-[28px] border border-[var(--border-light)] shadow-sm">
                      <div className="space-y-1">
                        <p className="font-black text-[var(--text-primary-light)] text-base">¿Querés programar el envío?</p>
                        <p className="text-xs text-[var(--text-tertiary-light)] font-medium leading-relaxed">Si no programás, la campaña se envía lo antes posible.</p>
                      </div>
                      <Switch checked={newCampaign.programar} onCheckedChange={v => setNewCampaign({...newCampaign, programar: v})} />
                    </div>

                    {newCampaign.programar && (
                      <div className="grid grid-cols-2 gap-4 p-7 bg-white border border-[var(--border-light)] rounded-[28px] animate-in zoom-in-95 duration-300 shadow-sm">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black tracking-widest uppercase ml-1">Fecha de envío</Label>
                          <Input type="date" value={newCampaign.fecha} onChange={e => setNewCampaign({...newCampaign, fecha: e.target.value})} className="rounded-2xl h-12 bg-slate-50 border-slate-200 font-bold" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black tracking-widest uppercase ml-1">Hora de envío</Label>
                          <Input type="time" value={newCampaign.hora} onChange={e => setNewCampaign({...newCampaign, hora: e.target.value})} className="rounded-2xl h-12 bg-slate-50 border-slate-200 font-bold" />
                        </div>
                      </div>
                    )}

                    <div className="bg-blue-50 border border-blue-100 p-7 rounded-[28px] flex items-start gap-5 shadow-sm">
                      <div className="w-11 h-11 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 border border-blue-200 shadow-inner">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-black text-blue-900">Modo Goteo activado</p>
                        <p className="text-[13px] text-blue-800/80 leading-relaxed font-medium">
                          Los mensajes se envían en intervalos aleatorios para proteger la reputación de tu número de WhatsApp y evitar que Meta lo limite.
                        </p>
                      </div>
                    </div>

                    {/* Resumen final */}
                    <div className="bg-slate-900 rounded-[28px] p-7 space-y-4 text-white">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Resumen de la campaña</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Campaña</p>
                          <p className="font-black text-base">{newCampaign.nombre || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Destinatarios</p>
                          <p className="font-black text-base">{filteredAudience} contactos</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Plantilla</p>
                          <p className="font-black text-base">{plantillas.find(p => p.id === newCampaign.plantillaId)?.nombre || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Envío</p>
                          <p className="font-black text-base">{newCampaign.programar ? `${newCampaign.fecha} a las ${newCampaign.hora}` : 'Lo antes posible'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="px-8 py-6 border-t border-[var(--border-light)] bg-white shrink-0">
                <div className="flex items-center justify-between w-full">
                  <Button variant="ghost" onClick={() => campaignStep > 1 && setCampaignStep(campaignStep - 1)} className={cn("rounded-xl px-6 font-bold text-xs gap-2 transition-all hover:bg-slate-100", campaignStep === 1 && "opacity-0 pointer-events-none")}>
                    <ChevronLeft className="w-4 h-4" /> Anterior
                  </Button>

                  {campaignStep < 3 ? (
                    <Button
                      onClick={() => setCampaignStep(campaignStep + 1)}
                      disabled={campaignStep === 1 && !newCampaign.nombre || campaignStep === 2 && !newCampaign.plantillaId}
                      className="bg-black text-white h-12 px-10 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-black/10 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      Siguiente <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button onClick={handleCreateCampaign} className="bg-[var(--accent)] text-[var(--accent-text)] h-12 px-10 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20 transition-all hover:scale-[1.05] active:scale-95">
                      <Rocket className="w-4 h-4 mr-2" /> Lanzar Campaña
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Panel de Ayuda Expandible (Global) */}
      {showHelp === "general" && <HelpPanel data={helpContent.general} />}

      {/* Tabs Navigation */}
      <Tabs defaultValue="campanas" className="space-y-8" onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-input)]/50 p-2 rounded-[24px] border border-[var(--border-light)]">
          <TabsList className="bg-transparent border-none p-0 h-auto gap-1">
            <TabTrigger value="campanas" label="Campañas" icon={<Send className="w-3.5 h-3.5" />} />
            <TabTrigger value="plantillas" label="Plantillas Meta" icon={<LayoutGrid className="w-3.5 h-3.5" />} />
            <TabTrigger value="automatizaciones" label="Automatizaciones" icon={<Zap className="w-3.5 h-3.5" />} />
            <TabTrigger value="salud" label="Salud de Cuenta" icon={<ShieldCheck className="w-3.5 h-3.5" />} />
          </TabsList>
        </div>

        {/* Pestaña de Campañas */}
        <TabsContent value="campanas" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-tertiary-light)]">Resumen de Difusión</h2>
            <button
              onClick={() => setShowHelp(showHelp === "campanas" ? null : "campanas")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all",
                showHelp === "campanas" ? "bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]" : "bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 shadow-sm"
              )}
            >
              <Lightbulb className="w-3.5 h-3.5" /> ¿Cómo funciona?
            </button>
          </div>

          <TabDescription
            description="Enviá un mensaje de WhatsApp al mismo tiempo a muchos contactos. Podés elegir a quién le llega filtrando por etiquetas del CRM."
            example="Mandá una promo de invierno solo a los clientes que tienen la etiqueta 'Interesados en calzado', sin molestar al resto."
          />

          {showHelp === "campanas" && <HelpPanel data={helpContent.campanas} compact />}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard title="Mensajes Enviados" value={campanas.reduce((acc, c) => acc + (c.estadisticas?.enviados || 0), 0).toString()} sub="Total acumulado" icon={<Send className="text-blue-500" />} />
            <MetricCard title="Tasa de Apertura" value="0%" sub="Promedio" icon={<Activity className="text-emerald-500" />} />
            <MetricCard title="Respuestas" value="0" sub="Interacciones" icon={<MessageSquare className="text-purple-500" />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {campanas.map(c => {
              const total = c.estadisticas?.total || 0;
              const enviados = c.estadisticas?.enviados || 0;
              const fallidos = c.estadisticas?.fallidos || 0;
              const progreso = total > 0 ? Math.round((enviados / total) * 100) : 0;
              const enProgreso = c.estado === 'en_progreso';
              const completada = c.estado === 'completada';
              const conError = c.estado === 'error';
              const programada = c.estado === 'programada';

              const estadoBadge: Record<string, { label: string; className: string }> = {
                programada:  { label: 'Lista para enviar', className: 'bg-blue-100 text-blue-700 border-blue-200' },
                en_progreso: { label: 'Enviando...', className: 'bg-amber-100 text-amber-700 border-amber-200' },
                completada:  { label: 'Completada', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
                pausada:     { label: 'Pausada', className: 'bg-slate-100 text-slate-600 border-slate-200' },
                error:       { label: 'Error', className: 'bg-red-100 text-red-700 border-red-200' },
              };
              const badge = estadoBadge[c.estado] || estadoBadge.pausada;

              return (
                <div key={c.id} className={cn(
                  "bg-white border rounded-[32px] p-8 space-y-5 shadow-sm transition-all relative overflow-hidden",
                  enProgreso ? "border-amber-200 shadow-amber-100" :
                  completada ? "border-emerald-200" :
                  conError ? "border-red-200" :
                  "border-[var(--border-light)] hover:border-[var(--accent)]"
                )}>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={cn("text-[9px] font-black px-2.5 py-1 rounded-xl border flex items-center gap-1.5", badge.className)}>
                          {enProgreso && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                          {completada && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {conError && <XCircle className="w-2.5 h-2.5" />}
                          {badge.label}
                        </Badge>
                        <span className="text-[10px] font-bold text-[var(--text-tertiary-light)] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {c.programadaPara instanceof Timestamp ? format(c.programadaPara.toDate(), "dd MMM, HH:mm", { locale: es }) : 'Inmediato'}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-[var(--text-primary-light)] tracking-tight truncate">{c.nombre}</h3>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="rounded-full h-8 w-8 hover:bg-gray-100 flex items-center justify-center transition-colors shrink-0 border border-slate-100">
                        <MoreVertical className="w-4 h-4 text-slate-400" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl p-1 border-[var(--border-light)] shadow-2xl">
                        {(programada || conError) && (
                          <DropdownMenuItem
                            className="text-red-500 text-[10px] font-black uppercase tracking-widest gap-2 p-3 rounded-lg hover:bg-red-50 cursor-pointer"
                            onClick={() => deleteDoc(doc(db, 'espaciosDeTrabajo', currentWorkspaceId!, 'difusiones', c.id))}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                          </DropdownMenuItem>
                        )}
                        {enProgreso && (
                          <DropdownMenuItem
                            className="text-slate-600 text-[10px] font-black uppercase tracking-widest gap-2 p-3 rounded-lg hover:bg-slate-50 cursor-pointer"
                            onClick={() => cancelarCampaña(currentWorkspaceId!, c.id)}
                          >
                            <XCircle className="w-3.5 h-3.5" /> Pausar envío
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Barra de progreso (en_progreso y completada) */}
                  {(enProgreso || completada) && total > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Progreso del envío</span>
                        <span className="text-[10px] font-black text-slate-700">{enviados} / {total}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", completada ? "bg-emerald-500" : "bg-amber-400")}
                          style={{ width: `${progreso}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">{progreso}% completado{fallidos > 0 && ` · ${fallidos} fallidos`}</span>
                    </div>
                  )}

                  {/* Error */}
                  {conError && (
                    <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      <p className="text-xs text-red-700 font-semibold">{(c as any).metadata?.errorMsg || 'Ocurrió un error al enviar la campaña.'}</p>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Audiencia', value: total, color: 'text-slate-700' },
                      { label: 'Enviados', value: enviados, color: 'text-blue-600' },
                      { label: 'Leídos', value: c.estadisticas?.leidos || 0, color: 'text-emerald-600' },
                      { label: 'Fallidos', value: fallidos, color: fallidos > 0 ? 'text-red-500' : 'text-slate-400' },
                    ].map(stat => (
                      <div key={stat.label} className="text-center p-3 bg-slate-50 rounded-[16px] border border-slate-100/50">
                        <p className={cn("text-lg font-black", stat.color)}>{stat.value}</p>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tight">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Botón Despachar */}
                  {programada && (
                    <button
                      onClick={() => despacharCampaña(currentWorkspaceId!, c.id)}
                      className="w-full bg-[var(--accent)] text-black h-12 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-[var(--accent)]/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Despachar campaña ahora
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {campanas.length === 0 && !loading && (
            <EmptyState 
              icon={<Megaphone className="w-10 h-10 text-[var(--text-tertiary-light)] opacity-20" />}
              title="Sin campañas activas"
              desc="Es hora de impulsar tu negocio. Crea tu primera campaña de difusión por WhatsApp en pocos minutos."
              actionLabel="Empezar Ahora"
            />
          )}
        </TabsContent>

        {/* Pestaña de Plantillas */}
        <TabsContent value="plantillas" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-tertiary-light)]">Biblioteca de Contenido</h2>
            <button
              onClick={() => setShowHelp(showHelp === "plantillas" ? null : "plantillas")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all",
                showHelp === "plantillas" ? "bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]" : "bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 shadow-sm"
              )}
            >
              <Lightbulb className="w-3.5 h-3.5" /> Reglas de Meta
            </button>
          </div>

          <TabDescription
            description="WhatsApp obliga a que todos los mensajes masivos usen un 'molde' pre-aprobado por Meta. Acá creás y administrás esos moldes."
            example="Creás el mensaje '¡Hola {{nombre}}! Tenemos 20% de descuento este finde' y Meta lo revisa en hasta 24 hs. Una vez aprobado, podés usarlo en tus campañas."
          />

          {showHelp === "plantillas" && <HelpPanel data={helpContent.plantillas} compact />}

          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4 bg-blue-50/50 border border-blue-100 p-4 rounded-2xl pr-8 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm shrink-0 border border-blue-200"><Info className="w-5 h-5" /></div>
              <p className="text-xs text-blue-900 font-bold leading-relaxed">Para evitar spam, WhatsApp requiere que todas las campañas usen plantillas pre-aprobadas.</p>
            </div>
            
            <Dialog open={isCreatingTemplate} onOpenChange={setIsCreatingTemplate}>
              <DialogTrigger className="bg-black text-white h-11 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-black/10 transition-all hover:scale-[1.02] flex items-center">
                <Plus className="w-4 h-4 mr-2" />Nueva Plantilla
              </DialogTrigger>
              <DialogContent className="max-w-5xl h-[90vh] bg-white border-none rounded-[40px] p-0 overflow-hidden flex flex-col shadow-2xl">
                <DialogHeader className="px-10 pt-8 pb-6 border-b bg-slate-50/50 shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[1.5rem] bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200 shadow-inner">
                      <LayoutGrid className="w-6 h-6" />
                    </div>
                    <div className="space-y-0.5">
                      <DialogTitle className="text-xl font-black tracking-tight text-[var(--text-primary-light)]">Nueva Plantilla de Mensaje</DialogTitle>
                      <DialogDescription className="font-medium text-[var(--text-secondary-light)]">Creá el molde del mensaje que Meta deberá aprobar antes de usarlo en campañas.</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <div className="flex-1 flex overflow-hidden">
                  {/* Formulario */}
                  <div className="flex-1 p-8 overflow-y-auto no-scrollbar space-y-8 bg-white">

                    {/* Nombre + Categoría */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre interno</Label>
                        <Input placeholder="ej: oferta_flash_agosto" value={newTemplate.nombre} onChange={e => setNewTemplate({...newTemplate, nombre: e.target.value})} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold px-5 shadow-sm focus:bg-white transition-all" />
                        <p className="text-[10px] text-slate-400 pl-1">Solo letras minúsculas, números y guion bajo. Sin espacios.</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tipo de mensaje</Label>
                        <Select value={newTemplate.categoria} onValueChange={v => setNewTemplate({...newTemplate, categoria: v as any})}>
                          <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold shadow-sm focus:bg-white transition-all"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl shadow-2xl min-w-[280px]">
                            <SelectItem value="MARKETING" className="py-3 px-4">
                              <div className="space-y-0.5">
                                <p className="font-black text-sm">Marketing</p>
                                <p className="text-[11px] text-slate-400 font-medium">Promociones, ofertas y novedades</p>
                              </div>
                            </SelectItem>
                            <SelectItem value="UTILITY" className="py-3 px-4">
                              <div className="space-y-0.5">
                                <p className="font-black text-sm">Utilidad</p>
                                <p className="text-[11px] text-slate-400 font-medium">Confirmaciones, recordatorios, avisos</p>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Cuerpo del mensaje */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between ml-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Texto del mensaje</Label>
                        <span className="text-[10px] font-bold text-slate-300">{newTemplate.body.length} / 1024</span>
                      </div>
                      <Textarea
                        ref={templateBodyRef}
                        className="min-h-[160px] bg-slate-50 border-slate-200 rounded-[24px] p-6 leading-relaxed resize-none font-semibold text-sm focus:ring-2 focus:ring-[var(--accent)]/10 transition-all shadow-sm focus:bg-white"
                        value={newTemplate.body}
                        onChange={e => setNewTemplate({...newTemplate, body: e.target.value})}
                      />

                      {/* Botón insertar nombre */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => insertVariable("{{1}}")}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-black transition-all hover:scale-[1.02] active:scale-95",
                            newTemplate.body.includes("{{1}}")
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-sm"
                          )}
                        >
                          <Users className="w-3.5 h-3.5" />
                          Insertar nombre del cliente
                          {newTemplate.body.includes("{{1}}") && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                        </button>
                        <p className="text-[11px] text-slate-400 font-medium">
                          Se reemplaza automáticamente con el nombre de cada contacto al enviar.
                        </p>
                      </div>
                    </div>

                    {/* Pie de página */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 ml-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pie de página</Label>
                        <span className="text-[9px] font-black uppercase tracking-widest text-orange-500 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">Obligatorio</span>
                      </div>
                      <div className="h-12 rounded-2xl bg-slate-100 border border-slate-200 font-semibold text-sm px-5 flex items-center text-slate-400 select-none cursor-not-allowed">
                        Respondé SALIR para no recibir más mensajes.
                      </div>
                      <p className="text-[10px] text-slate-400 pl-1">Meta exige incluir una opción de baja en mensajes masivos. Si el contacto responde "SALIR", queda excluido automáticamente.</p>
                    </div>
                  </div>

                  {/* Vista Previa Móvil */}
                  <div className="w-[380px] bg-slate-900 border-l border-white/5 p-8 flex flex-col items-center gap-6 relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 bg-[var(--accent)]/5 blur-[100px] rounded-full" />
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest relative z-10">Vista previa</p>
                    <div className="bg-[#E5DDD5] rounded-[40px] border-[8px] border-[#202c33] shadow-2xl overflow-hidden w-full max-w-[260px] relative z-10 flex flex-col" style={{ aspectRatio: '9/18.5' }}>
                      <div className="bg-[#075e54] p-3 flex items-center gap-2.5 shrink-0 shadow-md">
                        <div className="w-6 h-6 rounded-full bg-white/20 border border-white/10 flex items-center justify-center"><Phone className="w-3 h-3 text-white/80" /></div>
                        <div className="text-[9px] font-black text-white uppercase tracking-widest">Imalá Vox Business</div>
                      </div>
                      <div className="flex-1 p-3 overflow-y-auto no-scrollbar" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}>
                        <div className="bg-white rounded-[16px] p-3 shadow-sm text-[10px] whitespace-pre-wrap font-semibold leading-relaxed relative before:absolute before:w-2.5 before:h-2.5 before:bg-white before:top-0 before:-left-1 before:rotate-45 before:rounded-sm">
                          {newTemplate.body.replace(/\{\{\d+\}\}/g, (m) => {
                            const names = ['_Juan_', '_pedido_122_', '_dato_'];
                            const idx = parseInt(m.replace(/[{}]/g, '')) - 1;
                            return names[idx] || '______';
                          })}
                          {newTemplate.footer && <div className="mt-2 pt-2 border-t border-slate-100 text-[8px] text-slate-400 font-medium">{newTemplate.footer}</div>}
                        </div>
                      </div>
                    </div>
                    <p className="text-[9px] text-white/30 font-medium text-center relative z-10 leading-relaxed">Las variables como {"{{1}}"} se muestran<br/>con datos de ejemplo</p>
                  </div>
                </div>
                <DialogFooter className="px-10 py-6 border-t bg-slate-50/50 shrink-0">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 border border-amber-200">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-slate-600">Revisión en 2 a 24 horas</p>
                        <p className="text-[10px] text-slate-400 font-medium">Meta revisa el contenido antes de aprobarlo</p>
                      </div>
                    </div>
                    <Button onClick={handleCreateTemplate} className="bg-[var(--accent)] text-black h-12 px-10 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20 transition-all hover:scale-[1.05]">
                      Enviar a Revisión
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plantillas.map(p => <TemplateCard key={p.id} plantilla={p} />)}
          </div>
        </TabsContent>

        {/* Pestaña de Automatizaciones */}
        <TabsContent value="automatizaciones" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-tertiary-light)]">Inteligencia de Respuesta</h2>
            <button
              onClick={() => setShowHelp(showHelp === "automatizaciones" ? null : "automatizaciones")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all",
                showHelp === "automatizaciones" ? "bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]" : "bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 shadow-sm"
              )}
            >
              <Lightbulb className="w-3.5 h-3.5" /> ¿Cómo automatizar?
            </button>
          </div>

          <TabDescription
            description="Cuando alguien comenta una palabra específica en tu Instagram, el bot responde automáticamente: primero en el post (público) y luego por mensaje privado (DM)."
            example="Publicás una foto de un producto y alguien comenta 'PRECIO'. El bot responde al instante en el post y le manda el catálogo completo por DM, sin que tengas que hacer nada."
          />

          {showHelp === "automatizaciones" && <HelpPanel data={helpContent.automatizaciones} compact />}

          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4 bg-amber-50/50 border border-amber-100 p-4 rounded-2xl pr-8 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-sm shrink-0 border border-amber-200"><Zap className="w-5 h-5" /></div>
              <p className="text-xs text-amber-900 font-bold leading-relaxed">Configura palabras clave que disparen respuestas automáticas en tus publicaciones de Instagram.</p>
            </div>
            
            <Dialog open={isCreatingTrigger} onOpenChange={setIsCreatingTrigger}>
              <DialogTrigger className="bg-black text-white h-11 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-black/10 transition-all hover:scale-[1.02] flex items-center justify-center">
                <Plus className="w-4 h-4 mr-2" />Nuevo Disparador
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-white border-none rounded-[40px] p-0 overflow-hidden shadow-2xl flex flex-col">
                <DialogHeader className="p-10 pb-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-[2.2rem] bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner border border-amber-200 group relative">
                    <Zap className="w-8 h-8" />
                    <Sparkles className="w-4 h-4 absolute -top-1 -right-1 text-amber-500 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <DialogTitle className="text-2xl font-black tracking-tight text-[var(--text-primary-light)]">Automatización de Instagram</DialogTitle>
                    <DialogDescription className="font-semibold text-[var(--text-secondary-light)]">Cuando alguien comente la palabra clave en tu post, el bot responde en público y por DM automáticamente.</DialogDescription>
                  </div>
                </DialogHeader>

                <div className="px-10 pb-10 space-y-8 flex-1">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre de la Regla</Label>
                    <div className="relative group">
                      <Input placeholder="Ej: Información Catálogo 2024" value={newTrigger.nombre} onChange={e => setNewTrigger({...newTrigger, nombre: e.target.value})} className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold px-12 shadow-sm focus:bg-white transition-all focus:ring-amber-500/20" />
                      <Command className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Cuenta de Instagram</Label>
                      <Select value={newTrigger.canalId} onValueChange={v => setNewTrigger({...newTrigger, canalId: v})}>
                        <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold shadow-sm focus:bg-white transition-all hover:bg-slate-100">
                          <SelectValue placeholder={canalesIG.length === 0 ? "Sin cuentas conectadas" : "Seleccioná una cuenta"} />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl shadow-2xl border-slate-100">
                          {canalesIG.length === 0 ? (
                            <div className="p-4 text-center text-sm text-slate-400 font-medium">No hay cuentas de Instagram conectadas</div>
                          ) : (
                            canalesIG.map(canal => (
                              <SelectItem key={canal.id} value={canal.id} className="p-3">
                                <div className="flex items-center gap-2">
                                  <Instagram className="w-4 h-4 text-rose-500" />
                                  <span className="font-bold">{canal.nombre || canal.cuenta}</span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Palabra Clave</Label>
                      <div className="relative">
                        <Input placeholder="Ej: INFO" value={newTrigger.palabraClave} onChange={e => setNewTrigger({...newTrigger, palabraClave: e.target.value})} className="h-14 rounded-2xl bg-[var(--accent)] text-black font-black px-12 text-center tracking-widest border-none shadow-lg shadow-[var(--accent)]/10 placeholder:text-black/30" />
                        <Hash className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-black/50" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Respuesta Pública (En el post)</Label>
                    <div className="relative">
                      <Input value={newTrigger.respuestaPublica} onChange={e => setNewTrigger({...newTrigger, respuestaPublica: e.target.value})} className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold px-12 shadow-sm focus:bg-white transition-all" />
                      <MessageSquare className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Respuesta Privada (DM)</Label>
                    <div className="relative">
                      <Textarea className="min-h-[140px] rounded-[32px] bg-slate-50 border-slate-200 font-bold p-8 leading-relaxed resize-none shadow-sm focus:bg-white transition-all" value={newTrigger.respuestaDM} onChange={e => setNewTrigger({...newTrigger, respuestaDM: e.target.value})} />
                      <Send className="w-4 h-4 absolute left-4 top-6 text-slate-400" />
                    </div>
                  </div>
                </div>

                <DialogFooter className="p-8 bg-slate-50/50 border-t border-slate-100">
                  <Button onClick={handleCreateTrigger} className="w-full bg-[var(--accent)] text-black h-14 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20 transition-all hover:scale-[1.02] active:scale-95 group">
                    <Rocket className="w-4 h-4 mr-2 group-hover:animate-bounce" />
                    Activar Disparador
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {disparadores.map(trigger => (
              <div key={trigger.id} className="bg-white border border-[var(--border-light)] rounded-[32px] p-8 space-y-6 shadow-sm hover:border-[var(--accent)] transition-all group relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 shadow-sm border border-rose-100 group-hover:bg-rose-500 group-hover:text-white transition-all duration-500">
                    <Instagram className="w-6 h-6" />
                  </div>
                  <Switch checked={trigger.activo} onCheckedChange={() => toggleTrigger(trigger.id, trigger.activo)} />
                </div>
                <div className="space-y-2">
                  <h4 className="text-base font-bold text-[var(--text-primary-light)] tracking-tight">{trigger.nombre}</h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="bg-slate-900 text-white text-[9px] font-black tracking-widest px-3 py-1 border-none rounded-lg shadow-md">
                      KEYWORD: {trigger.config.palabraClave}
                    </Badge>
                    {trigger.config.canalId && (() => {
                      const canal = canalesIG.find(c => c.id === trigger.config.canalId);
                      return canal ? (
                        <Badge variant="outline" className="bg-rose-50 text-rose-500 border-rose-100 text-[9px] font-black tracking-widest px-3 py-1 rounded-lg gap-1">
                          <Instagram className="w-3 h-3" />{canal.nombre || canal.cuenta}
                        </Badge>
                      ) : null;
                    })()}
                  </div>
                </div>
                <div className="pt-6 border-t border-slate-50 flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-9 px-4 text-red-500 font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-red-50 gap-2 transition-all" onClick={() => deleteTrigger(trigger.id)}>
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar Regla
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Pestaña de Salud de Cuenta */}
        <TabsContent value="salud" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-tertiary-light)]">Estado Operativo</h2>
            <button
              onClick={() => setShowHelp(showHelp === "salud" ? null : "salud")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all",
                showHelp === "salud" ? "bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]" : "bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 shadow-sm"
              )}
            >
              <Lightbulb className="w-3.5 h-3.5" /> Métricas de Reputación
            </button>
          </div>

          <TabDescription
            description="Muestra si tu número de WhatsApp Business está en buen estado ante Meta. Si muchos usuarios te marcan como spam, WhatsApp puede reducir la cantidad de mensajes que podés enviar por día."
            example="Si tu 'Quality Rating' baja a amarillo o rojo, revisá que estés enviando mensajes solo a personas que te dieron su número voluntariamente y que el contenido sea relevante para ellas."
          />

          {showHelp === "salud" && <HelpPanel data={helpContent.salud} compact />}

          <div className="bg-white border border-[var(--border-light)] rounded-[40px] p-10 shadow-sm space-y-12 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full -mr-32 -mt-32 transition-all group-hover:bg-emerald-500/10" />
            
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-20 h-20 rounded-[28px] bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-inner border border-emerald-100 group-hover:scale-105 transition-transform duration-500 shadow-emerald-200/20">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-[var(--text-primary-light)] tracking-tight">Estado: Saludable</h3>
                <p className="text-sm text-[var(--text-tertiary-light)] font-medium leading-relaxed max-w-sm">Tu cuenta de WhatsApp Business está operando con métricas óptimas y sin advertencias.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              <HealthCard label="Quality Rating" value="Excelente" desc="Sin reportes negativos" color="emerald" percent={98} />
              <HealthCard label="Límite de Envío" value="1.0k / día" desc="Tier 2" color="blue" percent={25} />
              <HealthCard label="Webhook Latency" value="120ms" desc="Conexión ultra-estable" color="purple" percent={85} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
    </PlanGate>
  );
}

// --- COMPONENTES AUXILIARES ---

function HelpPanel({ data, compact = false }: { data: any, compact?: boolean }) {
  return (
    <div className={cn(
      "bg-white border border-[var(--border-light)] rounded-[32px] overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2 duration-200",
      compact ? "mx-2" : ""
    )}>
      <div className="px-8 pt-8 pb-6 border-b border-[var(--border-light)]">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-[var(--bg-sidebar)] border border-[var(--border-dark)] flex items-center justify-center shrink-0 shadow-sm">
            <Lightbulb className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-[var(--text-primary-light)] uppercase tracking-tight">{data.titulo}</h3>
            <p className="text-sm text-[var(--text-secondary-light)] leading-relaxed font-medium">{data.descripcion}</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {data.items.map((item: any, i: number) => (
            <div key={i} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-2 group hover:border-[var(--accent)]/30 transition-all shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0 group-hover:scale-125 transition-transform" />
                <span className="text-[11px] font-black text-[var(--text-primary-light)] uppercase tracking-widest">{item.titulo}</span>
              </div>
              <p className="text-[12px] text-[var(--text-tertiary-light)] leading-relaxed pl-3.5 font-medium">{item.detalle}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabTrigger({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  return (
    <TabsTrigger value={value} className="rounded-xl px-6 py-2.5 text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-[var(--text-primary-light)] data-[state=active]:shadow-sm transition-all flex items-center gap-2.5 group">
      <span className="transition-transform group-data-[state=active]:scale-110">{icon}</span>
      {label}
    </TabsTrigger>
  );
}

function MetricCard({ title, value, sub, icon }: any) {
  return (
    <div className="bg-white border border-[var(--border-light)] rounded-[32px] p-8 flex items-center gap-6 shadow-sm hover:border-[var(--accent)] transition-all group overflow-hidden relative">
      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl border border-slate-100 group-hover:bg-white group-hover:scale-110 transition-all duration-500 shadow-inner">{icon}</div>
      <div>
        <p className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-[0.1em] mb-1">{title}</p>
        <h4 className="text-3xl font-black text-[var(--text-primary-light)] mb-0.5 tracking-tight">{value}</h4>
        <p className="text-[11px] font-bold text-slate-400">{sub}</p>
      </div>
    </div>
  );
}

function TemplateCard({ plantilla }: { plantilla: PlantillaMeta & { id: string } }) {
  const statusColors: Record<string, string> = { 
    APPROVED: "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-emerald-100/50", 
    PENDING: "bg-amber-50 text-amber-600 border-amber-200 shadow-amber-100/50", 
    REJECTED: "bg-red-50 text-red-600 border-red-200 shadow-red-100/50" 
  };
  
  const currentStatusColor = statusColors[plantilla.estado] || "bg-slate-50 text-slate-600 border-slate-200 shadow-slate-100/50";

  return (
    <div className="bg-white border border-[var(--border-light)] rounded-[32px] p-8 space-y-6 shadow-sm hover:border-[var(--accent)] transition-all group overflow-hidden relative">
      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-2">
          <Badge variant="outline" className={cn("text-[9px] font-black tracking-widest border px-3 py-1 rounded-xl shadow-sm", currentStatusColor)}>
            {plantilla.estado}
          </Badge>
          <h4 className="text-base font-bold text-[var(--text-primary-light)] truncate max-w-[180px] tracking-tight">{plantilla.nombre}</h4>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full h-9 w-9 hover:bg-slate-50 flex items-center justify-center transition-colors border border-transparent hover:border-slate-100 shadow-sm">
            <MoreVertical className="w-4 h-4 text-slate-300" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl p-2 border-slate-100 shadow-2xl min-w-[160px]">
            <DropdownMenuItem className="rounded-xl text-[10px] font-black uppercase tracking-widest gap-3 p-3 cursor-pointer"><Eye className="w-4 h-4" /> Ver Previa</DropdownMenuItem>
            <DropdownMenuItem className="rounded-xl text-[10px] font-black uppercase tracking-widest gap-3 p-3 cursor-pointer text-red-500 focus:text-red-500"><Trash2 className="w-4 h-4" /> Eliminar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100/50 group-hover:bg-white group-hover:border-[var(--accent)]/20 transition-all shadow-inner">
        <p className="text-[12px] text-slate-500 line-clamp-3 leading-relaxed font-bold italic">
          "{plantilla.componentes.find(c => c.type === 'BODY')?.text || "Sin contenido"}"
        </p>
      </div>
      <div className="flex items-center justify-between pt-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{plantilla.categoria}</span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">Sincronizado</span>
        </div>
      </div>
    </div>
  );
}

function HealthCard({ label, value, desc, color, percent }: any) {
  const colors: any = { emerald: "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]", blue: "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]", purple: "bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]" };
  return (
    <div className="p-8 bg-slate-50/50 rounded-[32px] border border-slate-100 space-y-5 group hover:bg-white transition-all shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        <span className="text-xs font-black text-slate-900">{value}</span>
      </div>
      <div className="h-2.5 bg-white rounded-full overflow-hidden border border-slate-100 shadow-inner">
        <div className={cn("h-full rounded-full transition-all duration-1000", colors[color])} style={{ width: `${percent}%` }} />
      </div>
      <p className="text-[11px] text-slate-400 font-bold leading-relaxed">{desc}</p>
    </div>
  );
}

function TabDescription({ description, example }: { description: string; example: string }) {
  return (
    <div className="mx-2 bg-white border border-[var(--border-light)] rounded-2xl px-6 py-4 flex items-start gap-4 shadow-sm">
      <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center shrink-0 mt-0.5">
        <Lightbulb className="w-4 h-4 text-[var(--accent)]" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[var(--text-primary-light)] leading-relaxed">{description}</p>
        <p className="text-xs text-[var(--text-tertiary-light)] font-medium leading-relaxed">
          <span className="font-black text-[var(--text-secondary-light)] uppercase tracking-wider text-[10px]">Ejemplo: </span>
          {example}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, desc, actionLabel }: any) {
  return (
    <div className="bg-white border border-slate-100 rounded-[48px] p-20 text-center flex flex-col items-center justify-center space-y-8 shadow-sm relative overflow-hidden group">
      <div className="absolute inset-0 bg-slate-50/50 -z-10" />
      <div className="w-28 h-28 bg-white rounded-[40px] flex items-center justify-center border border-slate-100 shadow-2xl relative transition-transform duration-700 group-hover:scale-110">
        <div className="absolute inset-0 bg-[var(--accent)]/5 blur-2xl rounded-full scale-0 group-hover:scale-100 transition-transform duration-700" />
        <div className="relative z-10 transition-transform duration-500 group-hover:rotate-12">{icon}</div>
      </div>
      <div className="max-w-md space-y-3 relative z-10">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h3>
        <p className="text-sm text-slate-400 font-medium leading-relaxed px-4">{desc}</p>
      </div>
      <Button className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black h-14 px-10 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20 transition-all hover:scale-[1.05] active:scale-95 relative z-10 group">
        <Plus className="w-5 h-5 mr-3 group-hover:rotate-90 transition-transform" />
        {actionLabel}
      </Button>
    </div>
  );
}
