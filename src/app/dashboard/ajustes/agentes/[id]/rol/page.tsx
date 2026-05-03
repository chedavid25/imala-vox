"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp, increment } from "firebase/firestore";
import { COLLECTIONS, Agente } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { 
  Save, 
  Loader2, 
  Users2,
  Contact2,
  ShieldQuestion,
  ShieldCheck,
  Zap,
  Info,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  User,
  HelpCircle,
  Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";

import { PERSONALIDADES, Personality } from "@/lib/constants/personalidades";

export default function RolPublicoAgente() {
  const { currentWorkspaceId, setCurrentAgentName } = useWorkspaceStore();
  const { id } = useParams();
  const [data, setData] = useState({
    rolPublico: "",
    rolAgente: "",
    personalidadId: "",
    nombrePublico: ""
  });
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customPersona, setCustomPersona] = useState<Agente['personalidadCustom']>({
    nombre: "",
    bio: "",
    avatarUrl: "",
    tono: "Profesional",
    estilo: "Amistoso",
    rasgos: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Personality | null>(null);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);

  const handlePrevPersona = () => {
    if (!selectedPersona) return;
    const currentIndex = PERSONALIDADES.findIndex(p => p.id === selectedPersona.id);
    const prevIndex = (currentIndex - 1 + PERSONALIDADES.length) % PERSONALIDADES.length;
    setSelectedPersona(PERSONALIDADES[prevIndex]);
  };

  const handleNextPersona = () => {
    if (!selectedPersona) return;
    const currentIndex = PERSONALIDADES.findIndex(p => p.id === selectedPersona.id);
    const nextIndex = (currentIndex + 1) % PERSONALIDADES.length;
    setSelectedPersona(PERSONALIDADES[nextIndex]);
  };

  useEffect(() => {
    async function fetchAgente() {
      if (!currentWorkspaceId || !id) return;
      try {
        const docRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES, id as string);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const agente = snap.data() as Agente;
          setData({
            rolPublico: agente.rolPublico || "",
            rolAgente: agente.rolAgente || "",
            personalidadId: agente.personalidadId || "",
            nombrePublico: agente.nombrePublico || ""
          });
          if (agente.personalidadCustom) {
            setCustomPersona(agente.personalidadCustom);
          }
          // Sincronizar con el sidebar
          setCurrentAgentName(agente.nombrePublico || agente.nombre || "Agente");
        }
      } catch (err) {
        toast.error("Error al cargar datos del agente");
      } finally {
        setLoading(false);
      }
    }
    fetchAgente();
  }, [currentWorkspaceId, id]);

  const handleSave = async () => {
    if (!currentWorkspaceId || !id) return;
    setSaving(true);
    try {
      const docRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES, id as string);
      await updateDoc(docRef, {
        rolPublico: data.rolPublico,
        rolAgente: data.rolAgente,
        personalidadId: data.personalidadId,
        nombrePublico: data.nombrePublico,
        personalidadCustom: customPersona,
        configuracionVersion: increment(1),
        actualizadoEl: serverTimestamp()
      });
      // Sincronizar con el sidebar inmediatamente
      setCurrentAgentName(data.nombrePublico || "Agente");
      toast.success("Perfil de identidad actualizado");
    } catch (err) {
      toast.error("Error al guardar cambios");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectPersona = (persona: Personality) => {
    setData({ ...data, personalidadId: persona.id });
    setIsPersonaModalOpen(false);
    toast.success(`Personalidad cambiada a ${persona.nombre}`);
  };

  const { workspace } = useWorkspaceStore();
  const isPro = workspace?.plan === 'pro' || workspace?.plan === 'agencia';

  const handleSaveCustomPersona = async () => {
    setData({ ...data, personalidadId: "" }); // Desactivar la predefinida
    setIsCustomModalOpen(false);
    toast.success("Identidad propia configurada. No olvides Guardar Cambios para activar.");
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-[30px] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-black flex items-center justify-center text-[var(--accent)] shadow-xl">
            <ShieldCheck className="size-6" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-black tracking-tighter">Personalidad e Identidad</h1>
              <Button variant="ghost" size="icon" className="size-6 rounded-full text-slate-300 hover:text-black">
                <HelpCircle className="size-4" />
              </Button>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Define quién es el agente, cómo habla y con quién interactúa.
            </p>
          </div>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-black hover:bg-slate-900 text-[var(--accent)] h-12 px-8 rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center gap-2"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Guardar Cambios
        </Button>
      </div>

      {/* SECCIÓN DE IDENTIDAD BÁSICA */}
      <div className="bg-white border border-slate-100 p-6 rounded-[35px] shadow-sm flex items-center gap-6 group hover:shadow-md transition-all">
        <div className="size-14 rounded-2xl bg-black flex items-center justify-center text-[var(--accent)] shrink-0 shadow-lg rotate-3 group-hover:rotate-0 transition-all">
           <User className="size-7" />
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="space-y-1">
            <Label htmlFor="nombrePublico" className="text-xl font-bold text-black tracking-tighter">Nombre de la IA</Label>
            <p className="text-[10px] text-slate-400 font-medium italic">¿Cómo quieres que se presente ante tus clientes?</p>
          </div>
          <div className="relative group/input">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-[var(--accent)] transition-colors">
              <Pencil className="size-4" />
            </div>
            <Input 
              id="nombrePublico"
              placeholder="Ej: Sofía, Roberto, Soporte Imalá..."
              value={data.nombrePublico}
              onChange={e => setData({...data, nombrePublico: e.target.value})}
              className="bg-slate-50 border-2 border-slate-50 h-12 rounded-xl pl-12 pr-5 text-base font-bold text-black focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:border-[var(--accent)] focus-visible:bg-white transition-all shadow-inner"
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN DE PERSONALIDADES */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="space-y-1">
             <h3 className="text-lg font-bold uppercase tracking-[0.2em] text-black">Catálogo de Agentes</h3>
             <p className="text-sm text-slate-400 font-medium">Selecciona el perfil que mejor represente a tu negocio.</p>
          </div>
          <div className="flex items-center gap-3 bg-black text-[var(--accent)] px-5 py-2.5 rounded-full shadow-xl">
             <Users2 className="size-5" />
             <span className="text-[10px] font-bold uppercase tracking-widest">{PERSONALIDADES.length} Perfiles</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PERSONALIDADES.map((persona) => (
            <div 
              key={persona.id}
              onClick={() => {
                setSelectedPersona(persona);
                setIsPersonaModalOpen(true);
              }}
              className={cn(
                "group relative p-6 rounded-[35px] border-2 transition-all duration-500 cursor-pointer hover:shadow-2xl hover:-translate-y-2",
                data.personalidadId === persona.id 
                  ? "bg-white border-[var(--accent)] shadow-xl shadow-[var(--accent)]/10" 
                  : "bg-white border-slate-50 hover:border-slate-200"
              )}
            >
              <div className="flex flex-col items-center text-center space-y-5">
                <div className="relative">
                   <div className={cn(
                     "size-24 rounded-[30px] overflow-hidden border-4 transition-all duration-500 group-hover:rotate-3 shadow-inner",
                     data.personalidadId === persona.id ? "border-[var(--accent)]" : "border-slate-50"
                   )}>
                      <img 
                        src={persona.avatarUrl} 
                        alt={persona.nombre} 
                        className={cn(
                          "w-full h-full object-cover transition-all duration-700",
                          data.personalidadId === persona.id ? "grayscale-0" : "grayscale group-hover:grayscale-0"
                        )} 
                      />
                   </div>
                   {data.personalidadId === persona.id && (
                     <div className="absolute -top-3 -right-3 size-8 rounded-2xl bg-black flex items-center justify-center border-2 border-[var(--accent)] shadow-xl animate-bounce">
                        <CheckCircle className="size-4 text-[var(--accent)]" />
                     </div>
                   )}
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl font-bold text-slate-900 tracking-tight">{persona.nombre}</h4>
                  <div className="bg-black py-1.5 px-4 rounded-full shadow-lg">
                    <p className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest">{persona.profesion}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* CAMPO 1: PÚBLICO */}
          <div className="bg-white border border-slate-100 p-10 rounded-[45px] space-y-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex items-center gap-5 mb-4">
              <div className="size-16 rounded-[22px] bg-black flex items-center justify-center text-[var(--accent)] shadow-2xl shadow-black/20 group-hover:scale-110 transition-transform">
                <Users2 className="size-8" />
              </div>
              <div>
                <Label htmlFor="publico" className="text-2xl font-bold text-black tracking-tighter">Tu Cliente Ideal</Label>
                <p className="text-sm text-slate-400 font-medium italic">¿Con quién va a hablar la IA?</p>
              </div>
            </div>
            
            <div className="relative">
              <Textarea 
                id="publico"
                placeholder="Ej: Personas interesadas en alquilar departamentos temporarios..."
                value={data.rolPublico}
                onChange={e => setData({...data, rolPublico: e.target.value})}
                maxLength={300}
                className="bg-slate-50 border-none min-h-[160px] text-base font-medium resize-none rounded-[28px] p-8 focus-visible:ring-2 focus-visible:ring-black transition-all focus-visible:bg-white shadow-inner leading-relaxed"
              />
              <div className="absolute bottom-6 right-8 text-[10px] font-bold text-slate-300 tracking-widest">
                {data.rolPublico.length} / 300
              </div>
            </div>
          </div>

          {/* CAMPO 2: ROL */}
          <div className="bg-white border border-slate-100 p-10 rounded-[45px] space-y-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex items-center gap-5 mb-4">
              <div className="size-16 rounded-[22px] bg-black flex items-center justify-center text-[var(--accent)] shadow-2xl shadow-black/20 group-hover:scale-110 transition-transform">
                <Contact2 className="size-8" />
              </div>
              <div>
                <Label htmlFor="rol" className="text-2xl font-bold text-black tracking-tighter">Rol Estratégico</Label>
                <p className="text-sm text-slate-400 font-medium italic">¿Qué función cumple en tu empresa?</p>
              </div>
            </div>
            
            <div className="relative">
              <Textarea 
                id="rol"
                placeholder="Ej: Un concierge de hospitalidad proactivo, experto en la ciudad..."
                value={data.rolAgente}
                onChange={e => setData({...data, rolAgente: e.target.value})}
                maxLength={300}
                className="bg-slate-50 border-none min-h-[160px] text-base font-medium resize-none rounded-[28px] p-8 focus-visible:ring-2 focus-visible:ring-black transition-all focus-visible:bg-white shadow-inner leading-relaxed"
              />
              <div className="absolute bottom-6 right-8 text-[10px] font-bold text-slate-300 tracking-widest">
                {data.rolAgente.length} / 300
              </div>
            </div>
          </div>
      </div>

      <div className="p-5 bg-black rounded-[30px] shadow-xl flex items-center gap-5 border-l-[10px] border-[var(--accent)]">
        <div className="size-12 rounded-xl bg-[var(--accent)] flex items-center justify-center shrink-0">
          <Zap className="size-6 text-black" />
        </div>
        <p className="text-sm text-slate-300 font-medium leading-tight">
          <span className="font-bold text-[var(--accent)] uppercase text-[10px] tracking-[0.2em] block mb-0.5">Impacto Directo</span>
          La personalidad moldea el <span className="text-white font-bold">tono</span>, el público ajusta el <span className="text-white font-bold">lenguaje</span> y el rol define la <span className="text-white font-bold">autoridad</span>.
        </p>
      </div>

      {/* MODAL DE DETALLE DE PERSONALIDAD */}
      <Dialog open={isPersonaModalOpen} onOpenChange={setIsPersonaModalOpen}>
        <DialogContent className="!max-w-[900px] !w-[900px] bg-white rounded-[45px] border-none shadow-2xl p-0 overflow-hidden outline-none max-h-[85vh]">
          {selectedPersona && (
            <div className="flex flex-row w-full min-h-[500px] max-h-[85vh]">
              {/* Lado Izquierdo: Imagen */}
              <div className="w-[380px] bg-black relative group overflow-hidden shrink-0 h-auto">
                <img 
                  src={selectedPersona.avatarUrl} 
                  alt={selectedPersona.nombre} 
                  className="w-full h-full object-cover opacity-90 grayscale group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-10 text-white space-y-2">
                   <div className="bg-[var(--accent)] text-black px-3 py-1 rounded-full inline-block shadow-lg">
                     <p className="text-[9px] font-bold uppercase tracking-[0.2em]">{selectedPersona.profesion}</p>
                   </div>
                   <h2 className="text-4xl font-bold tracking-tighter leading-none">{selectedPersona.nombre}</h2>
                </div>
              </div>

              {/* Lado Derecho: Info */}
              <div className="flex-1 p-10 space-y-6 flex flex-col bg-white overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center px-5 py-1.5 rounded-full bg-black text-[var(--accent)] text-[10px] font-bold uppercase tracking-[0.2em] shadow-2xl">
                       Perfil de Agente IA
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-black leading-tight tracking-tighter">{selectedPersona.resumen}</h3>
                  <div className="relative p-5 bg-slate-50 rounded-[25px] border-l-4 border-black shadow-sm">
                    <p className="text-[13px] text-slate-600 font-medium leading-relaxed italic pl-1">"{selectedPersona.bio}"</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                  <DetailItem label="Edad Estimada" value={`${selectedPersona.edad} Años`} />
                  <DetailItem label="Estilo de Personalidad" value={selectedPersona.personalidad} />
                  <DetailItem label="Tono de voz" value={selectedPersona.tono} />
                  <DetailItem label="Actividad / Oficio" value={selectedPersona.profesion} />
                  <DetailItem label="Especialidades" value={selectedPersona.skills.join(", ")} />
                  <DetailItem label="Residencia" value={selectedPersona.viveEn} />
                </div>

                <div className="pt-6 mt-auto flex items-center justify-between border-t border-slate-100">
                   <div className="flex gap-4">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={handlePrevPersona}
                        className="size-12 rounded-[18px] border-slate-200 text-black hover:bg-black hover:text-[var(--accent)] transition-all shadow-lg active:scale-90"
                      >
                        <ArrowLeft className="size-5" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={handleNextPersona}
                        className="size-12 rounded-[18px] border-slate-200 text-black hover:bg-black hover:text-[var(--accent)] transition-all shadow-lg active:scale-90"
                      >
                        <ArrowRight className="size-5" />
                      </Button>
                   </div>
                   <Button 
                    onClick={() => handleSelectPersona(selectedPersona)}
                    className="bg-black hover:bg-slate-900 text-[var(--accent)] h-14 px-10 rounded-[20px] font-bold text-sm uppercase tracking-widest shadow-2xl transition-all hover:scale-[1.05] active:scale-95 flex items-center gap-3"
                   >
                     <CheckCircle className="size-4" />
                     Activar a {selectedPersona.nombre}
                   </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* PERSONALIDAD PERSONALIZADA (Solo PRO) */}
      <div className="bg-black text-white p-10 rounded-[45px] space-y-8 relative overflow-hidden shadow-2xl border-4 border-[var(--accent)]/10">
         <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 scale-125">
            <Zap className="size-32 text-[var(--accent)]" />
         </div>

         <div className="relative space-y-6">
            <div className="flex items-center gap-5">
              <div className="size-16 rounded-[22px] bg-[var(--accent)] flex items-center justify-center shadow-2xl shadow-[var(--accent)]/40 rotate-3">
                <Zap className="size-8 text-black" />
              </div>
              <div>
                <h3 className="text-2xl font-bold uppercase tracking-tighter">Identidad Custom <span className="text-[var(--accent)]">PRO</span></h3>
                <p className="text-sm text-[var(--accent)] font-bold italic tracking-wide">Tu marca, tus reglas, tu esencia.</p>
              </div>
            </div>

            <p className="text-base text-slate-400 leading-relaxed max-w-2xl font-medium">
              ¿Ninguno de nuestros perfiles encaja con tu marca? En el plan <span className="text-[var(--accent)] font-bold">PRO</span> puedes crear un agente con tu propio nombre, foto, tono de voz y rasgos de personalidad únicos.
            </p>

            <div className="pt-2">
               <Button 
                onClick={() => {
                  if (isPro) {
                    setIsCustomModalOpen(true);
                  } else {
                    toast.error("Esta función requiere el plan PRO o Agencia.");
                  }
                }}
                className="bg-[var(--accent)] hover:bg-white text-black h-14 px-10 rounded-[22px] font-bold text-sm uppercase tracking-widest shadow-[0_0_40px_-12px_rgba(204,255,0,0.4)] transition-all hover:scale-[1.05] active:scale-95"
               >
                 Configurar Identidad Propia
               </Button>
            </div>
         </div>
      </div>

      {/* MODAL DE IDENTIDAD CUSTOM */}
      <Dialog open={isCustomModalOpen} onOpenChange={setIsCustomModalOpen}>
        <DialogContent className="max-w-2xl bg-white rounded-[40px] p-10 border-none">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-3xl font-bold tracking-tighter text-black">Crea tu Identidad Propia</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Define los rasgos psicológicos y el estilo de comunicación único para tu marca.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-6">
            <div className="space-y-2">
              <Label className="text-sm font-bold uppercase tracking-widest text-slate-400">Nombre de la Identidad</Label>
              <Input 
                value={customPersona?.nombre}
                onChange={e => setCustomPersona({...customPersona!, nombre: e.target.value})}
                placeholder="Ej: Sofia de Atencion al Cliente"
                className="h-12 bg-slate-50 border-none rounded-xl font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold uppercase tracking-widest text-slate-400">Bio / Historia</Label>
              <Textarea 
                value={customPersona?.bio}
                onChange={e => setCustomPersona({...customPersona!, bio: e.target.value})}
                placeholder="Describe quién es, qué edad tiene y qué lo motiva..."
                className="min-h-[100px] bg-slate-50 border-none rounded-xl font-medium"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-bold uppercase tracking-widest text-slate-400">Tono de Voz</Label>
                <Input 
                  value={customPersona?.tono}
                  onChange={e => setCustomPersona({...customPersona!, tono: e.target.value})}
                  placeholder="Ej: Empático, Directo, Formal"
                  className="h-12 bg-slate-50 border-none rounded-xl font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold uppercase tracking-widest text-slate-400">Estilo de Respuesta</Label>
                <Input 
                  value={customPersona?.estilo}
                  onChange={e => setCustomPersona({...customPersona!, estilo: e.target.value})}
                  placeholder="Ej: Conciso, Explicativo"
                  className="h-12 bg-slate-50 border-none rounded-xl font-bold"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 gap-4">
            <Button variant="ghost" onClick={() => setIsCustomModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
            <Button 
              onClick={handleSaveCustomPersona}
              className="bg-black text-[var(--accent)] hover:bg-slate-900 rounded-xl px-10 font-bold"
            >
              Confirmar Identidad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-2 group">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] group-hover:text-black transition-colors">{label}</p>
      <p className="text-base font-bold text-black leading-tight">{value}</p>
      <div className="w-8 h-1 bg-slate-100 rounded-full group-hover:w-full group-hover:bg-[var(--accent)] transition-all duration-500" />
    </div>
  );
}

function Badge({ children, className }: any) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", className)}>
      {children}
    </span>
  );
}
