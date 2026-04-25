"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  deleteDoc, 
  doc,
  collectionGroup,
  getDocs,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { COLLECTIONS, RecursoConocimiento } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { subirYProcesarArchivoAction } from "@/app/actions/knowledge";
import { 
  FileText, 
  Download, 
  Trash2, 
  UploadCloud, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileIcon,
  Loader2,
  HardDrive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ArchivosGlobalPage() {
  const { currentWorkspaceId } = useWorkspaceStore();
  const [archivos, setArchivos] = useState<(RecursoConocimiento & { id: string, usageCount: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentWorkspaceId) return;

    // 1. Escuchar la colección de conocimiento global
    const q = query(
      collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONOCIMIENTO),
      where("tipo", "==", "archivo")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as (RecursoConocimiento & { id: string })[];
      
      // Calcular uso en tiempo real por cada archivo
      const updatedDocs = await Promise.all(docs.map(async (docData) => {
        const usageSnap = await getDocs(
          query(collectionGroup(db, COLLECTIONS.CONOCIMIENTO_ACTIVO), where("recursoId", "==", docData.id), where("activo", "==", true))
        );
        return { ...docData, usageCount: usageSnap.size };
      }));

      setArchivos(updatedDocs);
      setLoading(false);
    }, (error) => {
      console.error("Error en snapshot de archivos:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentWorkspaceId]);

  const handleDelete = async (archivo: any) => {
    if (archivo.usageCount > 0) {
      toast.error(`No puedes eliminar este archivo porque está siendo usado por ${archivo.usageCount} agentes.`);
      return;
    }

    if (!confirm("¿Estás seguro de que deseas eliminar este archivo del workspace?")) return;

    try {
      await deleteDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId!, COLLECTIONS.CONOCIMIENTO, archivo.id));
      toast.success("Archivo eliminado");
    } catch (err) {
      toast.error("Error al eliminar el archivo");
    }
  };

  const formatSize = (bytes: number | null | undefined) => {
    if (!bytes) return "0 KB";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Zona de Subida */}
      <div 
        onClick={() => document.getElementById('file-upload')?.click()}
        className="group relative border-2 border-dashed border-[var(--border-light)] hover:border-[var(--accent)] rounded-3xl p-12 bg-[var(--bg-card)]/30 transition-all cursor-pointer overflow-hidden"
      >
        <input 
          type="file" 
          id="file-upload" 
          className="hidden" 
          multiple
          accept=".pdf,.docx,.txt,.md"
          onChange={async (e) => {
            const files = e.target.files;
            if (!files || !currentWorkspaceId) return;
            
            for (const file of Array.from(files)) {
              try {
                toast.loading(`Certificando conocimiento de ${file.name}...`, { id: 'upload' });
                
                const formData = new FormData();
                formData.append("file", file);

                const result = await subirYProcesarArchivoAction(currentWorkspaceId, formData);

                if (result.success) {
                  toast.success(`Archivo ${file.name} procesado y cargado`, { id: 'upload' });
                } else {
                  toast.error(`Error al cargar ${file.name}: ${result.error}`, { id: 'upload' });
                }
              } catch (err: any) {
                console.error("Error completo al subir archivo:", err);
                toast.error(`Error al cargar ${file.name}: ${err.message || 'Error desconocido'}`, { id: 'upload' });
              }
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/0 to-[var(--accent)]/[0.02] group-hover:to-[var(--accent)]/[0.05] transition-all" />
        <div className="relative flex flex-col items-center justify-center space-y-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-sidebar)] border border-[var(--border-dark)] flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-sm">
            <UploadCloud className="w-8 h-8 text-[var(--accent)]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[var(--text-primary-light)]">Sube tus documentos de entrenamiento</h3>
            <p className="text-sm text-[var(--text-tertiary-light)] max-w-sm">
              Arrastra archivos PDF, DOCX o TXT. Claude los analizará para responder con precisión.
            </p>
          </div>
          <p className="text-[10px] font-bold text-[var(--text-tertiary-light)] uppercase tracking-widest opacity-50">
            Formatos soportados: .pdf, .docx, .txt, .md (Máx 20MB)
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4">
        <h3 className="text-sm font-bold text-[var(--text-primary-light)] flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-[var(--text-secondary-light)]" />
          Archivos del Workspace
        </h3>
        <p className="text-xs text-[var(--text-tertiary-light)] font-medium">
          {archivos.length} archivos cargados
        </p>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--text-tertiary-light)]" />
        </div>
      ) : archivos.length === 0 ? (
        <div className="p-12 text-center border border-[var(--border-light)] rounded-3xl bg-[var(--bg-card)]/50">
          <p className="text-sm text-[var(--text-tertiary-light)]">Aún no has subido archivos al cerebro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {archivos.map((archivo) => (
            <div 
              key={archivo.id}
              className="group flex items-center justify-between p-4 bg-[var(--bg-card)] border border-[var(--border-light)] rounded-2xl hover:border-[var(--border-light-strong)] hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-input)] flex items-center justify-center shrink-0">
                  <FileIcon className="w-5 h-5 text-[var(--text-tertiary-light)]" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-[var(--text-primary-light)] truncate">
                    {archivo.titulo || archivo.archivoNombre}
                  </h4>
                  <div className="flex items-center gap-3 text-[11px] font-medium text-[var(--text-tertiary-light)]">
                    <span>{formatSize(archivo.archivoTamano)}</span>
                    <span className="opacity-30">•</span>
                    <span className="flex items-center gap-1.5 bg-[var(--bg-sidebar)] px-2 py-0.5 rounded-md border border-[var(--border-dark)]">
                      {archivo.estado === 'activo' ? (
                        <CheckCircle2 className="w-3 h-3 text-[var(--accent)]" />
                      ) : archivo.estado === 'procesando' ? (
                        <Loader2 className="w-3 h-3 animate-spin text-[var(--accent)]" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-[var(--error)]" />
                      )}
                      <span className={cn(
                        "text-[10px] uppercase font-bold tracking-tight",
                        archivo.estado === 'activo' ? "text-[var(--accent)]" : "text-[var(--text-tertiary-dark)]"
                      )}>
                        {archivo.estado}
                      </span>
                    </span>
                    <span className="opacity-30">•</span>
                    <div className="flex items-center gap-1.5 bg-[var(--accent)] text-[var(--accent-text)] px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm">
                      Usado por {archivo.usageCount} agentes
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-[var(--text-tertiary-light)] hover:text-[var(--text-primary-light)] hover:bg-[var(--bg-input)]">
                  <Download className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDelete(archivo)}
                  className="w-8 h-8 rounded-full text-[var(--text-tertiary-light)] hover:text-[var(--error)] hover:bg-[var(--error)]/5"
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
