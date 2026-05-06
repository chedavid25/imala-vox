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
  Lightbulb
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
import { db } from "@/lib/firebase";
import { COLLECTIONS, PlantillaMeta, CampañaDifusion, DisparadorAuto, EtiquetaCRM, Contacto } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function DifusionPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState("campanas");
  const [loading, setLoading] = useState(true);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [isCreatingTrigger, setIsCreatingTrigger] = useState(false);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [campaignStep, setCampaignStep] = useState(1);
  const [showHelp, setShowHelp] = useState<string | null>(null);

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
    footer: "Escribe SALIR para no recibir más mensajes.",
    buttons: [] as any[]
  });

  // Estado para nuevo disparador
  const [newTrigger, setNewTrigger] = useState({
    nombre: "",
    tipo: "instagram_comment",
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

    return () => {
      unsubPlantillas();
      unsubCampanas();
      unsubTriggers();
      unsubEtiquetas();
      unsubContactos();
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
      if (newTemplate.footer) componentes.push({ type: 'FOOTER', text: newTemplate.footer });
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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <Megaphone className="w-4 h-4 text-[var(--text-tertiary-light)]" />
            <span className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Operación & Marketing</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--text-primary-light)] tracking-tight">Difusión y Automatización</h1>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full h-8 w-8 text-[var(--accent)] hover:bg-[var(--accent)]/10"
              onClick={() => setShowHelp("general")}
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-sm text-[var(--text-tertiary-light)] font-medium">Gestiona tus campañas masivas y disparadores inteligentes.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-2xl border-[var(--border-light)] bg-white h-11 px-4 text-[11px] font-black uppercase tracking-widest gap-2 shadow-sm">
            <History className="w-4 h-4" />
            Log de Actividad
          </Button>
          
          <Dialog open={isCreatingCampaign} onOpenChange={setIsCreatingCampaign}>
            <DialogTrigger className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] h-11 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Campaña
            </DialogTrigger>
            <DialogContent className="max-w-4xl bg-white border-[var(--border-light)] rounded-[40px] p-0 overflow-hidden flex flex-col h-[80vh]">
              <DialogHeader className="p-8 border-b border-[var(--border-light)] shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-2xl font-bold tracking-tight">Crear Campaña de Difusión</DialogTitle>
                    <DialogDescription className="font-medium">Llega a tus clientes de forma masiva en 3 pasos.</DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3].map(s => (
                      <div key={s} className={cn("w-2.5 h-2.5 rounded-full transition-all duration-300", campaignStep >= s ? "bg-[var(--accent)] scale-110" : "bg-[var(--bg-input)]")} />
                    ))}
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto no-scrollbar p-8">
                {campaignStep === 1 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="space-y-4">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-[var(--text-tertiary-light)]">1. Identificación y Audiencia</Label>
                      <Input placeholder="Nombre de la campaña (ej: Promoción Verano 2024)" value={newCampaign.nombre} onChange={e => setNewCampaign({...newCampaign, nombre: e.target.value})} className="h-12 rounded-xl text-sm" />
                    </div>

                    <div className="space-y-4">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-[var(--text-tertiary-light)]">2. Filtrar por Etiquetas</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {etiquetas.map(tag => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => {
                              const current = newCampaign.etiquetasSeleccionadas;
                              setNewCampaign({
                                ...newCampaign,
                                etiquetasSeleccionadas: current.includes(tag.id!) ? current.filter(id => id !== tag.id) : [...current, tag.id!]
                              });
                            }}
                            className={cn(
                              "p-3 rounded-xl border text-[10px] font-bold transition-all text-left flex items-center justify-between",
                              newCampaign.etiquetasSeleccionadas.includes(tag.id!) 
                                ? "border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--text-primary-light)]" 
                                : "border-[var(--border-light)] bg-white text-[var(--text-tertiary-light)]"
                            )}
                          >
                            {tag.nombre}
                            {newCampaign.etiquetasSeleccionadas.includes(tag.id!) && <CheckCircle2 className="w-3 h-3 text-[var(--accent)]" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-[var(--bg-input)]/50 p-6 rounded-3xl border border-[var(--border-light)] flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-[var(--border-light)] flex items-center justify-center text-[var(--accent)]">
                          <Users className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary-light)]">Audiencia Estimada</p>
                          <p className="text-xl font-black text-[var(--text-primary-light)]">{filteredAudience} Contactos</p>
                        </div>
                      </div>
                      <Badge className="bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20 text-[10px] font-black px-4 py-1.5 rounded-xl">Target Listo</Badge>
                    </div>
                  </div>
                )}

                {campaignStep === 2 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="space-y-4">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-[var(--text-tertiary-light)]">Seleccionar Contenido</Label>
                      <div className="grid grid-cols-2 gap-4">
                        {plantillas.filter(p => p.estado === 'APPROVED' || p.estado === 'PENDING').map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setNewCampaign({...newCampaign, plantillaId: p.id})}
                            className={cn(
                              "p-6 rounded-[28px] border-2 text-left transition-all space-y-3",
                              newCampaign.plantillaId === p.id 
                                ? "border-[var(--accent)] bg-[var(--accent)]/5" 
                                : "border-[var(--border-light)] bg-white hover:border-[var(--accent)]/50"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-[9px] font-black px-2 py-0.5">{p.categoria}</Badge>
                              {newCampaign.plantillaId === p.id && <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />}
                            </div>
                            <h4 className="font-bold text-sm text-[var(--text-primary-light)]">{p.nombre}</h4>
                            <p className="text-[10px] text-[var(--text-tertiary-light)] line-clamp-2 font-medium">
                              {p.componentes.find(c => c.type === 'BODY')?.text || "Sin vista previa"}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {campaignStep === 3 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-6 bg-[var(--bg-input)]/50 rounded-3xl border border-[var(--border-light)]">
                        <div className="space-y-1">
                          <p className="font-bold text-[var(--text-primary-light)]">Programar Envío</p>
                          <p className="text-xs text-[var(--text-tertiary-light)] font-medium">Define el momento exacto para el disparo.</p>
                        </div>
                        <Switch checked={newCampaign.programar} onCheckedChange={v => setNewCampaign({...newCampaign, programar: v})} />
                      </div>

                      {newCampaign.programar && (
                        <div className="grid grid-cols-2 gap-4 p-6 bg-white border border-[var(--border-light)] rounded-3xl animate-in zoom-in-95 duration-300">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black tracking-widest uppercase">Fecha</Label>
                            <Input type="date" value={newCampaign.fecha} onChange={e => setNewCampaign({...newCampaign, fecha: e.target.value})} className="rounded-xl" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black tracking-widest uppercase">Hora</Label>
                            <Input type="time" value={newCampaign.hora} onChange={e => setNewCampaign({...newCampaign, hora: e.target.value})} className="rounded-xl" />
                          </div>
                        </div>
                      )}

                      <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl flex items-start gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-blue-900 tracking-tight">Seguridad: Modo Goteo Activado</p>
                          <p className="text-xs text-blue-800/80 leading-relaxed font-medium">
                            Los mensajes se enviarán automáticamente en intervalos de 5 a 15 segundos para proteger la salud de tu número de WhatsApp y evitar detecciones de spam por parte de Meta.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="p-8 border-t border-[var(--border-light)] bg-white shrink-0">
                <div className="flex items-center justify-between w-full">
                  <Button variant="ghost" onClick={() => campaignStep > 1 && setCampaignStep(campaignStep - 1)} className={cn("rounded-xl px-6 font-bold text-xs gap-2", campaignStep === 1 && "opacity-0 pointer-events-none")}>
                    <ChevronLeft className="w-4 h-4" /> Anterior
                  </Button>
                  
                  {campaignStep < 3 ? (
                    <Button onClick={() => setCampaignStep(campaignStep + 1)} className="bg-black text-white h-12 px-10 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-black/10">
                      Continuar <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button onClick={handleCreateCampaign} className="bg-[var(--accent)] text-[var(--accent-text)] h-12 px-10 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20">
                      <Rocket className="w-4 h-4 mr-2" /> Lanzar Campaña
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-tertiary-light)]">Gestión de Campañas</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[var(--accent)] font-bold text-[10px] uppercase gap-2 hover:bg-[var(--accent)]/10"
              onClick={() => setShowHelp("campanas")}
            >
              <Lightbulb className="w-3.5 h-3.5" /> ¿Cómo crear una campaña?
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard title="Mensajes Enviados" value={campanas.reduce((acc, c) => acc + (c.estadisticas?.enviados || 0), 0).toString()} sub="Total acumulado" icon={<Send className="text-blue-500" />} />
            <MetricCard title="Tasa de Apertura" value="0%" sub="Promedio" icon={<Activity className="text-emerald-500" />} />
            <MetricCard title="Respuestas" value="0" sub="Interacciones" icon={<MessageSquare className="text-purple-500" />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {campanas.map(c => (
              <div key={c.id} className="bg-white border border-[var(--border-light)] rounded-[32px] p-8 space-y-6 shadow-sm hover:border-[var(--accent)] transition-all">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5", c.estado === 'programada' ? 'bg-blue-500 text-white border-none' : 'bg-emerald-500 text-white border-none')}>
                        {c.estado}
                      </Badge>
                      <span className="text-[10px] font-bold text-[var(--text-tertiary-light)] flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {c.programadaPara instanceof Timestamp ? format(c.programadaPara.toDate(), "dd MMM, HH:mm", { locale: es }) : 'Ahora'}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-[var(--text-primary-light)]">{c.nombre}</h3>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="rounded-full h-8 w-8 hover:bg-gray-100 flex items-center justify-center transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="rounded-xl"><DropdownMenuItem className="text-red-500 text-xs font-bold gap-2 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /> Cancelar Campaña</DropdownMenuItem></DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-[var(--bg-input)]/50 rounded-2xl">
                    <p className="text-xl font-black text-[var(--text-primary-light)]">{c.estadisticas?.enviados || 0}</p>
                    <p className="text-[9px] font-black text-[var(--text-tertiary-light)] uppercase">Enviados</p>
                  </div>
                  <div className="text-center p-3 bg-[var(--bg-input)]/50 rounded-2xl">
                    <p className="text-xl font-black text-emerald-500">{c.estadisticas?.leidos || 0}</p>
                    <p className="text-[9px] font-black text-[var(--text-tertiary-light)] uppercase">Leídos</p>
                  </div>
                  <div className="text-center p-3 bg-[var(--bg-input)]/50 rounded-2xl">
                    <p className="text-xl font-black text-blue-500">{c.estadisticas?.total || 0}</p>
                    <p className="text-[9px] font-black text-[var(--text-tertiary-light)] uppercase">Target</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {campanas.length === 0 && !loading && (
            <EmptyState 
              icon={<Megaphone className="w-10 h-10 text-[var(--text-tertiary-light)] opacity-20" />}
              title="No hay campañas activas"
              desc="Crea tu primera campaña de difusión para llegar a tus leads de forma masiva y legal."
              actionLabel="Crear mi primera campaña"
            />
          )}
        </TabsContent>

        {/* Pestaña de Plantillas */}
        <TabsContent value="plantillas" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-tertiary-light)]">Plantillas Meta</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[var(--accent)] font-bold text-[10px] uppercase gap-2 hover:bg-[var(--accent)]/10"
              onClick={() => setShowHelp("plantillas")}
            >
              <Lightbulb className="w-3.5 h-3.5" /> Guía de aprobación
            </Button>
          </div>

          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600"><Info className="w-5 h-5" /></div>
              <div><p className="text-sm font-bold text-[var(--text-primary-light)]">Uso de Plantillas</p><p className="text-xs text-[var(--text-tertiary-light)] font-medium">Todos los mensajes masivos requieren una plantilla aprobada por Meta.</p></div>
            </div>
            
            <Dialog open={isCreatingTemplate} onOpenChange={setIsCreatingTemplate}>
              <DialogTrigger className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] h-10 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center">
                <Plus className="w-4 h-4 mr-2" />Nueva Plantilla
              </DialogTrigger>
              <DialogContent className="max-w-6xl h-[90vh] bg-[var(--bg-card)] border-[var(--border-light)] p-0 overflow-hidden flex flex-col">
                <DialogHeader className="p-6 border-b bg-white shrink-0"><DialogTitle className="text-xl font-bold">Diseñar Nueva Plantilla Meta</DialogTitle></DialogHeader>
                <div className="flex-1 flex overflow-hidden">
                  <div className="flex-1 p-8 overflow-y-auto no-scrollbar space-y-8 bg-white/30">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Nombre Interno</Label><Input placeholder="ej: bienvenida_clientes" value={newTemplate.nombre} onChange={e => setNewTemplate({...newTemplate, nombre: e.target.value})} className="rounded-xl" /></div>
                      <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Categoría</Label><Select value={newTemplate.categoria} onValueChange={v => setNewTemplate({...newTemplate, categoria: v as any})}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MARKETING">Marketing</SelectItem><SelectItem value="UTILITY">Utilidad</SelectItem></SelectContent></Select></div>
                    </div>
                    <div className="space-y-4"><Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Cuerpo del Mensaje</Label><Textarea className="min-h-[150px] bg-white rounded-2xl p-4 leading-relaxed resize-none" value={newTemplate.body} onChange={e => setNewTemplate({...newTemplate, body: e.target.value})} /></div>
                    <div className="space-y-4"><Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Pie de Página</Label><Input value={newTemplate.footer} onChange={e => setNewTemplate({...newTemplate, footer: e.target.value})} className="rounded-xl" /></div>
                  </div>
                  <div className="w-[450px] bg-[var(--bg-input)]/50 border-l p-12 flex flex-col items-center justify-center">
                    <div className="bg-[#E5DDD5] rounded-[42px] border-[8px] border-[#202c33] shadow-2xl overflow-hidden aspect-[9/18.5] w-full max-w-[280px]">
                      <div className="bg-[#075e54] p-4 flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-white/20" /><div className="text-[9px] font-bold text-white">Imalá Vox Business</div></div>
                      <div className="p-3"><div className="bg-white rounded-lg p-3 shadow-sm text-[10px] whitespace-pre-wrap">{newTemplate.body.replace(/\{\{\d+\}\}/g, '_____')}{newTemplate.footer && <div className="mt-2 pt-1 border-t text-[8px] text-gray-500">{newTemplate.footer}</div>}</div></div>
                    </div>
                  </div>
                </div>
                <DialogFooter className="p-6 border-t bg-white shrink-0"><Button onClick={handleCreateTemplate} className="bg-[var(--accent)] text-[var(--accent-text)] h-11 px-8 rounded-xl font-black text-[10px] uppercase">Enviar a Revisión</Button></DialogFooter>
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
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-tertiary-light)]">Instagram Automatizado</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[var(--accent)] font-bold text-[10px] uppercase gap-2 hover:bg-[var(--accent)]/10"
              onClick={() => setShowHelp("automatizaciones")}
            >
              <Lightbulb className="w-3.5 h-3.5" /> ¿Cómo funciona el keyword bot?
            </Button>
          </div>

          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600"><AlertCircle className="w-5 h-5" /></div>
              <div><p className="text-sm font-bold text-[var(--text-primary-light)]">Reglas de Automatización</p><p className="text-xs text-[var(--text-tertiary-light)] font-medium">Configura disparadores inteligentes que respetan las normas de Meta.</p></div>
            </div>
            
            <Dialog open={isCreatingTrigger} onOpenChange={setIsCreatingTrigger}>
              <DialogTrigger className="bg-[var(--accent)] text-[var(--accent-text)] h-10 px-6 rounded-xl font-black text-[10px] uppercase transition-all flex items-center justify-center">
                <Plus className="w-4 h-4 mr-2" />Nuevo Disparador
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-white border-[var(--border-light)] rounded-[32px] p-8 space-y-6">
                <DialogHeader><DialogTitle className="text-xl font-bold">Configurar Automatización</DialogTitle></DialogHeader>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Nombre</Label>
                    <Input placeholder="Ej: INFO en Post" value={newTrigger.nombre} onChange={e => setNewTrigger({...newTrigger, nombre: e.target.value})} className="rounded-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Canal</Label>
                      <Select 
                        value={newTrigger.tipo} 
                        onValueChange={v => setNewTrigger({...newTrigger, tipo: v as any})}
                      >
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="instagram_comment">Instagram</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Palabra Clave</Label>
                      <Input placeholder="Ej: INFO" value={newTrigger.palabraClave} onChange={e => setNewTrigger({...newTrigger, palabraClave: e.target.value})} className="rounded-xl" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Respuesta Pública</Label>
                    <Input value={newTrigger.respuestaPublica} onChange={e => setNewTrigger({...newTrigger, respuestaPublica: e.target.value})} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Respuesta DM</Label>
                    <Textarea className="min-h-[100px] rounded-xl" value={newTrigger.respuestaDM} onChange={e => setNewTrigger({...newTrigger, respuestaDM: e.target.value})} />
                  </div>
                </div>
                <DialogFooter><Button onClick={handleCreateTrigger} className="bg-[var(--accent)] text-[var(--accent-text)] h-11 px-8 rounded-xl font-black text-[10px] uppercase">Crear</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {disparadores.map(trigger => (
              <div key={trigger.id} className="bg-white border border-[var(--border-light)] rounded-[28px] p-6 space-y-6 shadow-sm hover:border-[var(--accent)] transition-all">
                <div className="flex items-center justify-between"><div className="w-12 h-12 bg-[#E1306C]/10 rounded-2xl flex items-center justify-center text-[#E1306C]"><Instagram className="w-6 h-6" /></div><Switch checked={trigger.activo} onCheckedChange={() => toggleTrigger(trigger.id, trigger.activo)} /></div>
                <div className="space-y-2"><h4 className="text-base font-bold text-[var(--text-primary-light)]">{trigger.nombre}</h4><Badge variant="outline" className="bg-[var(--bg-input)] text-[9px] font-black">KEYWORD: {trigger.config.palabraClave}</Badge></div>
                <div className="pt-4 border-t flex items-center gap-2"><Button variant="ghost" size="sm" className="h-8 px-3 text-red-500" onClick={() => deleteTrigger(trigger.id)}><Trash2 className="w-3.5 h-3.5" /> Eliminar</Button></div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Pestaña de Salud de Cuenta */}
        <TabsContent value="salud" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-tertiary-light)]">Salud y Cumplimiento</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[var(--accent)] font-bold text-[10px] uppercase gap-2 hover:bg-[var(--accent)]/10"
              onClick={() => setShowHelp("salud")}
            >
              <Lightbulb className="w-3.5 h-3.5" /> ¿Qué significan estas métricas?
            </Button>
          </div>

          <div className="bg-white border border-[var(--border-light)] rounded-[32px] p-8 shadow-sm space-y-10">
            <div className="flex items-center gap-5"><div className="w-16 h-16 rounded-[24px] bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-inner"><CheckCircle2 className="w-8 h-8" /></div><div className="space-y-1"><h3 className="text-xl font-bold text-[var(--text-primary-light)] tracking-tight">Estado: Saludable</h3><p className="text-sm text-[var(--text-tertiary-light)] font-medium">Tu cuenta está operando sin advertencias.</p></div></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><HealthCard label="Quality Rating" value="Alto" desc="Sin reportes" color="emerald" percent={95} /><HealthCard label="Límite" value="250 / día" desc="Tier 1" color="blue" percent={15} /><HealthCard label="Webhook" value="Estable" desc="240ms latencia" color="purple" percent={80} /></div>
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL DE AYUDA */}
      <Dialog open={showHelp !== null} onOpenChange={() => setShowHelp(null)}>
        <DialogContent className="max-w-2xl bg-white border-[var(--border-light)] rounded-[40px] p-0 overflow-hidden flex flex-col">
          <div className="p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                {showHelp === 'general' && <Megaphone className="w-7 h-7" />}
                {showHelp === 'campanas' && <Send className="w-7 h-7" />}
                {showHelp === 'plantillas' && <LayoutGrid className="w-7 h-7" />}
                {showHelp === 'automatizaciones' && <Zap className="w-7 h-7" />}
                {showHelp === 'salud' && <ShieldCheck className="w-7 h-7" />}
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-[var(--text-primary-light)]">
                  {showHelp === 'general' && "Manual de Difusión"}
                  {showHelp === 'campanas' && "Guía de Campañas"}
                  {showHelp === 'plantillas' && "Guía de Plantillas"}
                  {showHelp === 'automatizaciones' && "Guía de Automatización"}
                  {showHelp === 'salud' && "Guía de Salud de Cuenta"}
                </h2>
                <p className="text-sm text-[var(--text-tertiary-light)] font-medium">Todo lo que necesitas saber para operar profesionalmente.</p>
              </div>
            </div>

            <div className="space-y-6">
              {showHelp === 'general' && (
                <div className="space-y-4">
                  <div className="p-6 bg-[var(--bg-input)] rounded-3xl space-y-3">
                    <p className="text-sm font-bold text-[var(--text-primary-light)]">¿Qué es el módulo de Difusión?</p>
                    <p className="text-xs text-[var(--text-tertiary-light)] leading-relaxed">Es el centro de marketing masivo de Imalá Vox. Aquí puedes enviar mensajes a miles de clientes por WhatsApp (usando plantillas oficiales) y automatizar respuestas en Instagram.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <HelpStep number="1" title="Crea Plantillas" desc="Meta debe aprobar tus mensajes de marketing." />
                    <HelpStep number="2" title="Lanza Campañas" desc="Filtra a tu audiencia y envía con goteo seguro." />
                  </div>
                </div>
              )}

              {showHelp === 'campanas' && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <HelpDetailStep icon={<Users className="w-4 h-4" />} title="1. Audiencia" desc="Selecciona etiquetas del CRM. El sistema calculará cuántos contactos recibirán el mensaje." />
                    <HelpDetailStep icon={<LayoutGrid className="w-4 h-4" />} title="2. Contenido" desc="Elige una plantilla ya aprobada por Meta. No puedes enviar mensajes libres en campañas." />
                    <HelpDetailStep icon={<ShieldCheck className="w-4 h-4" />} title="3. Goteo Seguro" desc="Los mensajes salen cada 5-15 segundos. Esto evita que WhatsApp bloquee tu número por spam." />
                  </div>
                </div>
              )}

              {showHelp === 'plantillas' && (
                <div className="space-y-4">
                  <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-900 leading-relaxed font-medium">Meta (Facebook) revisa manualmente cada plantilla. El proceso puede tardar desde unos minutos hasta 24 horas.</p>
                  </div>
                  <div className="space-y-3">
                    <HelpDetailStep icon={<Type className="w-4 h-4" />} title="Usa {{1}}, {{2}}" desc="Usa corchetes para variables dinámicas como el nombre del cliente." />
                    <HelpDetailStep icon={<Smartphone className="w-4 h-4" />} title="Previsualiza" desc="Usa el simulador móvil de la derecha para ver cómo lo recibirá el cliente." />
                  </div>
                </div>
              )}

              {showHelp === 'automatizaciones' && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <HelpDetailStep icon={<Hash className="w-4 h-4" />} title="Trigger de Comentario" desc="Cuando alguien comenta una palabra clave (ej: INFO), el bot se activa." />
                    <HelpDetailStep icon={<MessageSquare className="w-4 h-4" />} title="Respuesta Pública" desc="El bot responde el comentario para generar interacción y prueba social." />
                    <HelpDetailStep icon={<Send className="w-4 h-4" />} title="DM Privado" desc="Se envía un único mensaje privado con el enlace o catálogo solicitado." />
                  </div>
                </div>
              )}

              {showHelp === 'salud' && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <HelpDetailStep icon={<Activity className="w-4 h-4" />} title="Quality Rating" desc="Si muchos clientes te reportan como SPAM, tu calificación bajará." />
                    <HelpDetailStep icon={<Users className="w-4 h-4" />} title="Límites de Envío" desc="Empezarás en Tier 1 (250 mensajes/día). A medida que envíes calidad, Meta subirá tu límite." />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="p-6 bg-[var(--bg-input)]/50 border-t border-[var(--border-light)] flex justify-end">
            <Button onClick={() => setShowHelp(null)} className="bg-black text-white rounded-xl px-8 font-black text-[10px] uppercase tracking-widest">Entendido</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---

function HelpStep({ number, title, desc }: any) {
  return (
    <div className="p-5 bg-white border border-[var(--border-light)] rounded-3xl space-y-2 shadow-sm">
      <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-black flex items-center justify-center text-[10px] font-black">{number}</div>
      <p className="text-xs font-bold text-[var(--text-primary-light)]">{title}</p>
      <p className="text-[10px] text-[var(--text-tertiary-light)] leading-relaxed font-medium">{desc}</p>
    </div>
  );
}

function HelpDetailStep({ icon, title, desc }: any) {
  return (
    <div className="flex items-start gap-4 p-4 hover:bg-[var(--bg-input)]/50 rounded-2xl transition-colors group">
      <div className="w-10 h-10 rounded-xl bg-white border border-[var(--border-light)] flex items-center justify-center text-[var(--text-tertiary-light)] group-hover:text-[var(--accent)] transition-colors">
        {icon}
      </div>
      <div className="space-y-1 flex-1">
        <p className="text-xs font-black text-[var(--text-primary-light)] uppercase tracking-widest">{title}</p>
        <p className="text-[11px] text-[var(--text-tertiary-light)] leading-relaxed font-medium">{desc}</p>
      </div>
    </div>
  );
}

function TabTrigger({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  return (
    <TabsTrigger value={value} className="rounded-xl px-5 py-2.5 text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-[var(--text-primary-light)] data-[state=active]:shadow-sm transition-all flex items-center gap-2">{icon}{label}</TabsTrigger>
  );
}

function MetricCard({ title, value, sub, icon }: any) {
  return (
    <div className="bg-white border border-[var(--border-light)] rounded-[28px] p-6 flex items-center gap-5 shadow-sm">
      <div className="w-12 h-12 bg-[var(--bg-input)] rounded-2xl flex items-center justify-center text-xl border border-[var(--border-light)]/50">{icon}</div>
      <div><p className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest mb-0.5">{title}</p><h4 className="text-2xl font-black text-[var(--text-primary-light)] mb-1">{value}</h4><p className="text-[10px] font-bold text-[var(--text-tertiary-light)]">{sub}</p></div>
    </div>
  );
}

function TemplateCard({ plantilla }: { plantilla: PlantillaMeta & { id: string } }) {
  const statusColors: Record<string, string> = { 
    APPROVED: "bg-emerald-50 text-emerald-600 border-emerald-100", 
    PENDING: "bg-amber-50 text-amber-600 border-amber-100", 
    REJECTED: "bg-red-50 text-red-600 border-red-100" 
  };
  
  const currentStatusColor = statusColors[plantilla.estado] || "bg-slate-50 text-slate-600 border-slate-100";

  return (
    <div className="bg-white border border-[var(--border-light)] rounded-[28px] p-6 space-y-4 shadow-sm hover:border-[var(--accent)] transition-all group overflow-hidden">
      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-1">
          <Badge variant="outline" className={cn("text-[9px] font-black tracking-widest border px-2 py-0.5", currentStatusColor)}>
            {plantilla.estado}
          </Badge>
          <h4 className="text-sm font-bold text-[var(--text-primary-light)] truncate max-w-[150px]">{plantilla.nombre}</h4>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full h-8 w-8 hover:bg-gray-100 flex items-center justify-center transition-colors">
            <MoreVertical className="w-4 h-4 text-[var(--text-tertiary-light)]" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl p-1 border-[var(--border-light)]">
            <DropdownMenuItem className="rounded-lg text-xs gap-2 cursor-pointer font-medium"><Eye className="w-3.5 h-3.5" /> Ver Previa</DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg text-xs gap-2 cursor-pointer font-medium text-red-500 focus:text-red-500"><Trash2 className="w-3.5 h-3.5" /> Eliminar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="p-4 bg-[var(--bg-input)]/50 rounded-2xl border border-[var(--border-light)]/50"><p className="text-[11px] text-[var(--text-secondary-light)] line-clamp-3 leading-relaxed font-medium">{plantilla.componentes.find(c => c.type === 'BODY')?.text || "Sin contenido"}</p></div>
      <div className="flex items-center justify-between pt-2"><span className="text-[10px] font-bold text-[var(--text-tertiary-light)] uppercase tracking-wider">{plantilla.categoria}</span><div className="flex items-center gap-1.5"><RefreshCw className="w-3 h-3 text-[var(--text-tertiary-light)]" /><span className="text-[10px] font-bold text-[var(--text-tertiary-light)]">Sincronizado</span></div></div>
    </div>
  );
}

function HealthCard({ label, value, desc, color, percent }: any) {
  const colors: any = { emerald: "bg-emerald-500", blue: "bg-blue-500", purple: "bg-purple-500" };
  return (
    <div className="p-6 bg-[var(--bg-input)]/50 rounded-[24px] border border-[var(--border-light)] space-y-4">
      <div className="flex items-center justify-between"><span className="text-xs font-bold text-[var(--text-secondary-light)] uppercase tracking-widest">{label}</span><span className="text-xs font-black text-[var(--text-primary-light)]">{value}</span></div>
      <div className="h-2 bg-white rounded-full overflow-hidden border border-black/5"><div className={cn("h-full rounded-full transition-all duration-1000", colors[color])} style={{ width: `${percent}%` }} /></div>
      <p className="text-[10px] text-[var(--text-tertiary-light)] font-bold">{desc}</p>
    </div>
  );
}

function EmptyState({ icon, title, desc, actionLabel }: any) {
  return (
    <div className="bg-white border border-[var(--border-light)] rounded-[40px] p-16 text-center flex flex-col items-center justify-center space-y-6 shadow-sm">
      <div className="w-24 h-24 bg-[var(--bg-input)] rounded-[32px] flex items-center justify-center border border-[var(--border-light)]/50 shadow-inner">{icon}</div>
      <div className="max-w-md space-y-2"><h3 className="text-xl font-bold text-[var(--text-primary-light)] tracking-tight">{title}</h3><p className="text-sm text-[var(--text-tertiary-light)] font-medium leading-relaxed">{desc}</p></div>
      <Button className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] h-12 px-10 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20 transition-all hover:scale-[1.05] active:scale-95"><Plus className="w-4 h-4 mr-2" />{actionLabel}</Button>
    </div>
  );
}
