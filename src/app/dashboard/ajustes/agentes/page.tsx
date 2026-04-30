"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, addDoc, Timestamp, serverTimestamp } from "firebase/firestore";
import { COLLECTIONS, Agente } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { 
  Bot, 
  Plus, 
  MoreVertical, 
  Settings, 
  Activity,
  UserCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  Lightbulb
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function AgentesPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [agentes, setAgentes] = useState<(Agente & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const router = useRouter();

  const [showHelp, setShowHelp] = useState(false);
  const [newAgente, setNewAgente] = useState({
    nombre: "",
    rolAgente: "Asistente Virtual"
  });

  const ayudaAgentes = {
    titulo: "¿Cómo funcionan los Agentes IA?",
    descripcion: "Los agentes son empleados virtuales especializados. Podés crear uno para ventas, otro para soporte, y cada uno tendrá su propia personalidad, base de conocimiento y canales asignados.",
    recomendacion: "Para mejores resultados, definí un 'Objetivo' claro y específico en sus instrucciones. Un agente enfocado en una sola tarea es mucho más efectivo que uno que intenta hacerlo todo.",
    items: [
      { titulo: "Personalidad", detalle: "Definí cómo habla el agente (formal, amigable) y qué límites tiene para que nunca improvise fuera de su rol." },
      { titulo: "Instrucciones", detalle: "Son el corazón del agente. Aquí le decís exactamente qué pasos seguir ante cada consulta del cliente." },
      { titulo: "Conexión Cerebral", detalle: "Elegí qué partes de tu Base de Conocimiento activa cada agente para que solo maneje información relevante." },
    ]
  };

  useEffect(() => {
    if (!currentWorkspaceId) return;

    const q = query(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as (Agente & { id: string })[];
      setAgentes(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentWorkspaceId]);

  const handleCrearAgente = async () => {
    if (!currentWorkspaceId || !newAgente.nombre) return;
    setIsAdding(true);

    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.AGENTES), {
        nombre: newAgente.nombre,
        avatar: null,
        activo: true,
        instrucciones: "Eres un asistente amable y profesional.\n\nREGLAS:\n- No uses emojis en tus respuestas.\n- Responde en texto plano, sin negritas ni asteriscos.\n- Sé breve y directo.",
        rolPublico: "Clientes del negocio",
        rolAgente: newAgente.rolAgente,
        modoDefault: 'copiloto',
        strictMode: false,
        horarioActivo: false,
        escalada: {
          mensajesSinResolucion: 5,
          mensajeEscalada: "En un momento te atenderá un humano.",
          notificarEmail: true
        },
        configuracionVersion: 1,
        creadoEl: serverTimestamp(),
        actualizadoEl: serverTimestamp()
      });

      toast.success("Agente creado correctamente");
      router.push(`/dashboard/ajustes/agentes/${docRef.id}/instrucciones`);
    } catch (error) {
      console.error("Error al crear agente:", error);
      toast.error("Error al crear el agente");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <Bot className="w-4 h-4 text-[var(--text-tertiary-light)]" />
            <span className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">Ajustes del Sistema</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary-light)] tracking-tight">Agentes IA</h1>
          <p className="text-sm text-[var(--text-tertiary-light)] font-medium">Gestiona las personalidades y cerebros de tu workspace.</p>
        </div>

        <div className="flex items-center gap-3">
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
            ¿Cómo funcionan?
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showHelp && "rotate-180")} />
          </button>

          <Dialog>
            <DialogTrigger
              render={
                <button className={cn(buttonVariants({ variant: 'default' }), "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] h-11 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20 transition-all hover:scale-[1.02] active:scale-95")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Agente
                </button>
              }
            />
          <DialogContent className="bg-[var(--bg-card)] border-[var(--border-light)]">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Agente</DialogTitle>
              <DialogDescription>Define la identidad básica de tu agente inteligente.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre del Agente</Label>
                <Input 
                  id="name" 
                  placeholder="Ej: Max de Ventas" 
                  value={newAgente.nombre}
                  onChange={e => setNewAgente({...newAgente, nombre: e.target.value})}
                  className="bg-[var(--bg-input)] border-[var(--border-light)]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Rol Principal</Label>
                <Input 
                  id="role" 
                  placeholder="Ej: Especialista en soporte" 
                  value={newAgente.rolAgente}
                  onChange={e => setNewAgente({...newAgente, rolAgente: e.target.value})}
                  className="bg-[var(--bg-input)] border-[var(--border-light)]"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose
                render={
                  <button 
                    onClick={handleCrearAgente} 
                    disabled={isAdding || !newAgente.nombre}
                    className={cn(buttonVariants(), "bg-[var(--accent)] text-[var(--accent-text)] px-4 h-10 rounded-lg font-bold flex items-center justify-center")}
                  >
                    {isAdding && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Crear Agente
                  </button>
                }
              />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
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
                <h3 className="text-sm font-bold text-[var(--text-primary-light)]">{ayudaAgentes.titulo}</h3>
                <p className="text-sm text-[var(--text-secondary-light)] leading-relaxed">{ayudaAgentes.descripcion}</p>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {ayudaAgentes.items.map((item, i) => (
                <div key={i} className="bg-[var(--bg-input)]/30 border border-[var(--border-light)] rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-active)] shrink-0" />
                    <span className="text-[12px] font-bold text-[var(--text-primary-light)] uppercase tracking-tight">{item.titulo}</span>
                  </div>
                  <p className="text-[12px] text-[var(--text-tertiary-light)] leading-relaxed pl-3.5 font-medium">{item.detalle}</p>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-[12px] font-black text-amber-800 uppercase tracking-widest">Recomendación Pro</p>
                <p className="text-[12px] text-amber-700 leading-relaxed font-medium">{ayudaAgentes.recomendacion}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4 text-[var(--text-tertiary-light)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          <p className="text-sm">Cargando agentes especializados...</p>
        </div>
      ) : agentes.length === 0 ? (
        <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-light)] rounded-3xl bg-[var(--bg-card)]/50 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-input)] flex items-center justify-center">
            <Bot className="w-8 h-8 text-[var(--text-tertiary-light)]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[var(--text-primary-light)]">No hay agentes configurados</h3>
            <p className="text-sm text-[var(--text-tertiary-light)] max-w-sm">
              Crea tu primer agente para automatizar la atención y conectar tu base de conocimiento.
            </p>
          </div>
          <Button variant="outline" className="border-[var(--border-light)] hover:bg-[var(--bg-input)]">
            Ver tutorial de configuración
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agentes.map(agente => (
            <div 
              key={agente.id}
              onClick={() => router.push(`/dashboard/ajustes/agentes/${agente.id}/instrucciones`)}
              className="bg-white border border-[var(--border-light)] rounded-[28px] p-7 hover:shadow-2xl hover:shadow-[var(--accent)]/10 transition-all cursor-pointer group active:scale-[0.98] relative"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 rounded-2xl bg-[var(--bg-input)] flex items-center justify-center border border-[var(--border-light)] group-hover:border-[var(--accent)]/40 transition-colors shadow-sm">
                  <Bot className="w-7 h-7 text-[var(--text-tertiary-light)] group-hover:text-[var(--accent)] transition-colors" />
                </div>
                <div className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-2 shadow-xl border transition-all duration-300",
                  agente.activo 
                    ? "bg-[#1A1A18] text-[var(--accent)] border-[var(--accent)]/30 ring-4 ring-[var(--accent)]/5" 
                    : "bg-[#1A1A18] text-[var(--text-tertiary-dark)] border-white/5 opacity-50"
                )}>
                  <Activity className={cn("w-3 h-3 animate-pulse", agente.activo ? "text-[var(--accent)]" : "text-[var(--text-tertiary-dark)]")} />
                  {agente.activo ? "En línea" : "Desconectado"}
                </div>
              </div>
              
              <div className="space-y-1.5 mb-6">
                <h3 className="text-lg font-bold text-[var(--text-primary-light)] group-hover:text-[var(--accent-active)] transition-colors tracking-tight">
                  {agente.nombre}
                </h3>
                <p className="text-[11px] text-[var(--text-tertiary-light)] font-bold uppercase tracking-widest line-clamp-1 opacity-70">
                  {agente.rolAgente}
                </p>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-[var(--border-light)]/50">
                <div className="flex items-center gap-2">
                  <div className={cn("size-2 rounded-full", agente.activo ? "bg-[var(--accent)]" : "bg-slate-300")} />
                  <span className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest">IA Configurada</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="bg-[var(--bg-input)] text-[var(--text-primary-light)] hover:bg-[var(--accent)] hover:text-[var(--accent-text)] transition-all font-bold rounded-xl h-9 px-5 text-[11px] uppercase tracking-wider shadow-sm"
                >
                  Entrar
                </Button>
              </div>
            </div>
          ))}
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
