"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  collectionGroup,
  getDocs,
  updateDoc
} from "firebase/firestore";
import { scrapearWebAction } from "@/app/actions/knowledge";
import { COLLECTIONS, RecursoConocimiento } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { 
  Globe, 
  Plus, 
  Trash2, 
  RefreshCw, 
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Link as LinkIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function WebsGlobalPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [webs, setWebs] = useState<(RecursoConocimiento & { id: string, usageCount: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [step, setStep] = useState(1);

  const [newWeb, setNewWeb] = useState({
    url: "",
    descripcion: "",
    modo: "single", // 'single' | 'recurse'
    frecuencia: "manual"
  });

  const [viewingWeb, setViewingWeb] = useState<RecursoConocimiento | null>(null);

  useEffect(() => {
    if (!currentWorkspaceId) return;

    const q = query(
      collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONOCIMIENTO),
      where("tipo", "==", "web")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as (RecursoConocimiento & { id: string })[];
      setWebs(docs.map(d => ({ ...d, usageCount: 0 })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentWorkspaceId]);

  const handleCreate = async () => {
    if (!currentWorkspaceId || !newWeb.url) return;
    setIsAdding(true);
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONOCIMIENTO), {
        tipo: 'web',
        titulo: newWeb.url.replace(/^https?:\/\//, ''),
        webUrl: newWeb.url,
        descripcion: newWeb.descripcion,
        frecuenciaActualizacion: newWeb.frecuencia,
        contenidoTexto: "", // Pendiente de scrapeo
        estado: 'procesando',
        creadoEl: serverTimestamp(),
        actualizadoEl: serverTimestamp(),
        ultimoScrapeo: null,
        creadoPor: "admin"
      });

      const urlToScrape = newWeb.url;
      toast.success("Web registrada. Iniciando lectura profunda...");
      setNewWeb({ url: "", descripcion: "", modo: "single", frecuencia: "manual" });
      setStep(1);

      // Disparar scraping en segundo plano
      const res = await scrapearWebAction(currentWorkspaceId, docRef.id, urlToScrape);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error("Error en lectura: " + res.error);
      }
    } catch (err) {
      toast.error("Error al registrar el sitio");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (w: any) => {
    if (w.usageCount > 0) {
      toast.error("Este sitio está activo en agentes.");
      return;
    }
    if (!confirm("¿Eliminar este sitio del cerebro?")) return;
    try {
      await deleteDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId!, COLLECTIONS.CONOCIMIENTO, w.id));
      toast.success("Sitio eliminado");
    } catch (err) {
      toast.error("Error al eliminar");
    }
  };

  const handleRefresh = async (id: string, url: string) => {
    if (!currentWorkspaceId) return;
    toast.info("Actualizando información del sitio...");
    const res = await scrapearWebAction(currentWorkspaceId, id, url);
    if (res.success) {
      toast.success(res.message);
    } else {
      toast.error("Error al actualizar: " + res.error);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-[var(--text-primary-light)]">Indexar Sitios Web</h3>
        
        <Dialog onOpenChange={(open) => !open && setStep(1)}>
          <DialogTrigger>
            <Button className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)]">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Sitio
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[var(--bg-card)] border-[var(--border-light)] max-w-lg">
            <DialogHeader>
              <DialogTitle>Indexar Sitio Web (Paso {step}/4)</DialogTitle>
            </DialogHeader>
            
            <div className="py-6 min-h-[300px] flex flex-col justify-center">
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="url">URL del sitio</Label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-3 w-4 h-4 text-[var(--text-tertiary-light)]" />
                      <Input 
                        id="url" 
                        value={newWeb.url}
                        onChange={e => setNewWeb({...newWeb, url: e.target.value})}
                        placeholder="https://tu-sitio.com" 
                        className="pl-10 bg-[var(--bg-input)] border-[var(--border-light)]"
                      />
                    </div>
                  </div>
                  <Button onClick={() => setStep(2)} disabled={!newWeb.url} className="w-full bg-[var(--accent)] text-[var(--accent-text)] mt-4">Siguiente</Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="desc">¿Qué información debe buscar la IA aquí?</Label>
                    <Textarea 
                      id="desc"
                      value={newWeb.descripcion}
                      onChange={e => setNewWeb({...newWeb, descripcion: e.target.value})}
                      placeholder="Ej: Información técnica sobre nuestros productos de software."
                      className="bg-[var(--bg-input)] border-[var(--border-light)] resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Atrás</Button>
                    <Button onClick={() => setStep(3)} className="flex-1 bg-[var(--accent)] text-[var(--accent-text)]">Siguiente</Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <Label>Modo de lectura</Label>
                  <div className="grid gap-3">
                    <button 
                      onClick={() => setNewWeb({...newWeb, modo: 'single'})}
                      className={cn(
                        "p-4 rounded-xl border text-left transition-all",
                        newWeb.modo === 'single' ? "bg-[var(--accent)]/5 border-[var(--accent)]" : "bg-[var(--bg-input)] border-[var(--border-light)] hover:border-[var(--border-light-strong)]"
                      )}
                    >
                      <h5 className="text-sm font-bold">Solo esta URL</h5>
                      <p className="text-xs text-[var(--text-tertiary-light)]">Indexar únicamente la página proporcionada.</p>
                    </button>
                    <button 
                      onClick={() => setNewWeb({...newWeb, modo: 'recurse'})}
                      className={cn(
                        "p-4 rounded-xl border text-left transition-all",
                        newWeb.modo === 'recurse' ? "bg-[var(--accent)]/5 border-[var(--accent)]" : "bg-[var(--bg-input)] border-[var(--border-light)] hover:border-[var(--border-light-strong)]"
                      )}
                    >
                      <h5 className="text-sm font-bold">Buscar vínculos (Profundo)</h5>
                      <p className="text-xs text-[var(--text-tertiary-light)]">Seguir links y leer hasta 20 páginas relacionadas.</p>
                    </button>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Atrás</Button>
                    <Button onClick={() => setStep(4)} className="flex-1 bg-[var(--accent)] text-[var(--accent-text)]">Siguiente</Button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Frecuencia de actualización</Label>
                    <Select value={newWeb.frecuencia} onValueChange={v => setNewWeb({...newWeb, frecuencia: v ?? 'manual'})}>
                      <SelectTrigger className="bg-[var(--bg-input)] border-[var(--border-light)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="diaria">Diaria</SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="mensual">Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-6">
                    <Button variant="outline" onClick={() => setStep(3)} className="flex-1">Atrás</Button>
                    <DialogClose>
                      <Button onClick={handleCreate} disabled={isAdding} className="flex-1 bg-[var(--accent)] text-[var(--accent-text)]">
                        {isAdding && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Indexar Ahora
                      </Button>
                    </DialogClose>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal para ver contenido extraído */}
        <Dialog open={!!viewingWeb} onOpenChange={() => setViewingWeb(null)}>
          <DialogContent className="bg-[var(--bg-card)] border-[var(--border-light)] max-w-4xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-[var(--text-secondary-light)]" />
                Contenido Extraído: {viewingWeb?.titulo}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto mt-4 p-4 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-light)]">
              {viewingWeb?.contenidoTexto ? (
                <pre className="text-xs whitespace-pre-wrap font-mono text-[var(--text-secondary-light)] leading-relaxed">
                  {viewingWeb.contenidoTexto}
                </pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-50 space-y-2 py-20">
                  <AlertCircle className="w-10 h-10" />
                  <p className="text-sm">No hay contenido extraído aún o el proceso falló.</p>
                </div>
              )}
            </div>
            <DialogFooter className="pt-4">
              <Button onClick={() => setViewingWeb(null)} className="bg-[var(--accent)] text-[var(--accent-text)]">Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--text-tertiary-light)]" />
        </div>
      ) : webs.length === 0 ? (
        <div className="p-12 text-center border border-[var(--border-light)] rounded-3xl bg-[var(--bg-card)]/50">
          <p className="text-sm text-[var(--text-tertiary-light)]">No hay sitios web indexados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {webs.map((w) => (
            <div 
              key={w.id}
              className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-2xl p-5 hover:border-[var(--border-light-strong)] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-[var(--bg-sidebar)] flex items-center justify-center shrink-0 border border-[var(--border-dark)] shadow-sm">
                  <Globe className="w-6 h-6 text-[var(--accent)]" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[var(--text-primary-light)] truncate max-w-[300px]">{w.webUrl}</h4>
                    <a href={w.webUrl ?? '#'} target="_blank" rel="noopener noreferrer" className="text-[var(--text-tertiary-light)] hover:text-[var(--text-primary-light)] transition-colors">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-[var(--text-tertiary-light)]">
                    <span className="flex items-center gap-1">
                      {w.estado === 'activo' ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      ) : w.estado === 'procesando' ? (
                        <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-[var(--error)]" />
                      )}
                      {w.estado === 'activo' ? `Activo — ${w.contenidoTexto?.length ? Math.round(w.contenidoTexto.length / 1000) : 0} kb indexados` : w.estado.charAt(0).toUpperCase() + w.estado.slice(1)}
                    </span>
                    <span className="opacity-30">•</span>
                    <span className="flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />
                      {w.frecuenciaActualizacion || 'Manual'}
                    </span>
                    <span className="opacity-30">•</span>
                    <span>Agentes: {w.usageCount}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-[var(--border-light)]">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleRefresh(w.id, w.webUrl!)}
                  disabled={w.estado === 'procesando'}
                  className="text-xs h-8 text-[var(--text-tertiary-light)] hover:text-[var(--text-primary-light)] hover:bg-[var(--bg-input)]"
                >
                  {w.estado === 'procesando' && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                  Actualizar
                </Button>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setViewingWeb(w)}
                  className="w-8 h-8 rounded-full text-[var(--text-tertiary-light)] hover:text-[var(--text-primary-light)] hover:bg-[var(--bg-input)]"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDelete(w)}
                  className="w-8 h-8 rounded-full text-[var(--text-tertiary-light)] hover:text-[var(--error)] hover:bg-[var(--error)]/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
