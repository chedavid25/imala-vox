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
  Loader2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const [newAgente, setNewAgente] = useState({
    nombre: "",
    rolAgente: "Asistente Virtual"
  });

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
        instrucciones: "Eres un asistente amable...",
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
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[var(--text-primary-light)]">Agentes IA</h1>
          <p className="text-sm text-[var(--text-tertiary-light)]">Gestiona las personalidades y cerebros de tu workspace.</p>
        </div>

        <Dialog>
          <DialogTrigger render={
            <Button className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Agente
            </Button>
          } />
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
              <DialogClose render={
                <Button 
                  onClick={handleCrearAgente} 
                  disabled={isAdding || !newAgente.nombre}
                  className="bg-[var(--accent)] text-[var(--accent-text)]"
                >
                  {isAdding && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Crear Agente
                </Button>
              } />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

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
              className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-2xl p-6 hover:shadow-xl hover:shadow-[var(--accent)]/5 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center group-hover:bg-[var(--accent)] transition-colors">
                  <Bot className="w-6 h-6 text-[var(--accent)] group-hover:text-[var(--accent-text)]" />
                </div>
                <div className={cn(
                  "px-2 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1",
                  agente.activo ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-[var(--text-tertiary-light)]/10 text-[var(--text-tertiary-light)]"
                )}>
                  <Activity className="w-3 h-3" />
                  {agente.activo ? "Activo" : "Inactivo"}
                </div>
              </div>
              
              <div className="space-y-1 mb-6">
                <h3 className="text-lg font-bold text-[var(--text-primary-light)] group-hover:text-[var(--accent)] transition-colors">
                  {agente.nombre}
                </h3>
                <p className="text-xs text-[var(--text-tertiary-light)] font-medium line-clamp-1">
                  {agente.rolAgente}
                </p>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-[var(--border-light)]">
                <div className="flex -space-x-2">
                  <div className="w-6 h-6 rounded-full bg-[var(--bg-input)] border-2 border-[var(--bg-card)] flex items-center justify-center overflow-hidden">
                    <UserCircle2 className="w-4 h-4 text-[var(--text-tertiary-light)]" />
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-[var(--accent)] hover:bg-[var(--accent)]/10">
                  Configurar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
