"use client";

import React, { useState, useRef } from "react";
import Papa from "papaparse";
import { db } from "@/lib/firebase";
import { collection, writeBatch, doc, serverTimestamp, Timestamp } from "firebase/firestore";
import { COLLECTIONS, Objeto } from "@/lib/types/firestore";
import { 
  Upload, FileText, CheckCircle2, AlertCircle, Loader2, 
  X, ChevronRight, ShoppingCart, Tag, Image as ImageIcon 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogFooter, DialogDescription 
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImportadorCSVProps {
  workspaceId: string;
  onSuccess?: () => void;
}

export function ImportadorCSV({ workspaceId, onSuccess }: ImportadorCSVProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [importando, setImportando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setPreview([]);
    setParsing(false);
    setImportando(false);
    setProgreso(0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
        toast.error("Por favor selecciona un archivo CSV válido.");
        return;
      }
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    setParsing(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setPreview(results.data.slice(0, 10)); // Mostrar los primeros 10
        setParsing(false);
        if (results.data.length === 0) {
          toast.error("El archivo está vacío.");
        } else {
          toast.success(`${results.data.length} productos detectados.`);
        }
      },
      error: (error) => {
        console.error("Error parseando CSV:", error);
        toast.error("Error al leer el archivo CSV.");
        setParsing(false);
      }
    });
  };

  const ejecutarImportacion = async () => {
    if (!file || !workspaceId) return;

    setImportando(true);
    setProgreso(0);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as any[];
        const total = data.length;
        const batchSize = 400; // Un poco menos del límite de 500 por seguridad
        let procesados = 0;

        try {
          for (let i = 0; i < total; i += batchSize) {
            const chunk = data.slice(i, i + batchSize);
            const batch = writeBatch(db);

            chunk.forEach((row) => {
              // Mapeo automático de WooCommerce
              const titulo = row.Nombre || row.title || row.nombre || "Sin título";
              const precio = parseFloat(row["Precio normal"] || row.regular_price || row.precio || "0");
              const descripcion = row["Descripción corta"] || row["Descripción"] || row.description || "";
              const fotosStr = row["Imágenes"] || row.images || "";
              const fotos = fotosStr ? fotosStr.split(",").map((s: string) => s.trim()) : [];
              const sku = row.SKU || row.sku || null;
              const categoria = row["Categorías"] || row.categories || null;
              const marca = row.Marcas || row.brands || null;

              const ref = doc(collection(db, COLLECTIONS.ESPACIOS, workspaceId, COLLECTIONS.OBJETOS));
              
              batch.set(ref, {
                tipo: 'producto',
                titulo,
                precio,
                moneda: 'ARS', // Default para WooCommerce AR
                descripcion: descripcion.replace(/<[^>]*>?/gm, ''), // Limpiar HTML
                fotos,
                caracteristicas: {
                  sku,
                  categoria,
                  marca,
                  importado: true,
                  fuente: 'CSV WooCommerce'
                },
                estado: 'disponible',
                creadoEl: serverTimestamp(),
                actualizadoEl: serverTimestamp()
              });
            });

            await batch.commit();
            procesados += chunk.length;
            setProgreso(Math.round((procesados / total) * 100));
          }

          toast.success(`Importación completada: ${total} productos.`);
          setOpen(false);
          reset();
          if (onSuccess) onSuccess();
        } catch (error) {
          console.error("Error importando:", error);
          toast.error("Error al guardar los productos en la base de datos.");
        } finally {
          setImportando(false);
        }
      }
    });
  };

  return (
    <>
      <Button 
        onClick={() => setOpen(true)}
        className="bg-[var(--bg-input)] border border-[var(--border-light)] hover:bg-[var(--bg-card)] text-[var(--text-secondary-light)] h-9 px-4 font-bold text-xs rounded-xl flex items-center gap-2"
      >
        <Upload className="w-4 h-4" />
        Importar CSV
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!importando) { setOpen(o); if (!o) reset(); } }}>
        <DialogContent className="bg-[var(--bg-card)] border-[var(--border-light)] max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[var(--text-primary-light)]">
              Importar Catálogo desde CSV
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--text-tertiary-light)]">
              Sube el archivo exportado de WooCommerce para cargar tus productos automáticamente.
            </DialogDescription>
          </DialogHeader>

          {!file ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[var(--border-light)] rounded-2xl p-12 flex flex-col items-center justify-center space-y-4 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-[var(--bg-input)] border border-[var(--border-light)] flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6 text-[var(--text-tertiary-light)]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-[var(--text-secondary-light)]">Haz clic para subir o arrastra un archivo</p>
                <p className="text-[10px] text-[var(--text-tertiary-light)] uppercase font-black tracking-widest mt-1">Soporta formato CSV de WooCommerce</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".csv"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Archivo seleccionado */}
              <div className="bg-[var(--bg-input)] border border-[var(--border-light)] rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[var(--text-primary-light)] truncate max-w-[200px]">{file.name}</p>
                    <p className="text-[10px] text-[var(--text-tertiary-light)]">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                {!importando && (
                  <Button variant="ghost" size="icon" onClick={reset} className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Preview */}
              {preview.length > 0 && !importando && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest px-1">Vista previa (Primeros 10)</p>
                  <div className="border border-[var(--border-light)] rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-[10px] border-collapse">
                      <thead className="bg-[var(--bg-input)] sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-bold border-b border-[var(--border-light)]">Nombre</th>
                          <th className="px-3 py-2 text-left font-bold border-b border-[var(--border-light)]">Precio</th>
                          <th className="px-3 py-2 text-left font-bold border-b border-[var(--border-light)]">Categoría</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-light)]">
                        {preview.map((row, i) => (
                          <tr key={i} className="hover:bg-[var(--bg-input)]/50">
                            <td className="px-3 py-2 text-[var(--text-secondary-light)] truncate max-w-[150px]">{row.Nombre || row.nombre || '—'}</td>
                            <td className="px-3 py-2 text-[var(--text-secondary-light)] font-medium">ARS {row["Precio normal"] || row.precio || '0'}</td>
                            <td className="px-3 py-2 text-[var(--text-tertiary-light)] truncate max-w-[100px]">{row["Categorías"] || row.categoria || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Barra de progreso */}
              {importando && (
                <div className="space-y-3 py-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[var(--text-secondary-light)] flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin text-[var(--accent)]" />
                      Importando productos...
                    </span>
                    <span className="font-black text-[var(--accent)]">{progreso}%</span>
                  </div>
                  <div className="h-2 w-full bg-[var(--bg-input)] rounded-full overflow-hidden border border-[var(--border-light)]">
                    <div 
                      className="h-full bg-[var(--accent)] transition-all duration-300 shadow-[0_0_10px_rgba(var(--accent-rgb),0.3)]" 
                      style={{ width: `${progreso}%` }} 
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-[var(--border-light)]">
            {!file ? (
              <Button variant="ghost" onClick={() => setOpen(false)} className="text-xs font-bold text-[var(--text-tertiary-light)]">Cerrar</Button>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary-light)] font-medium">
                  <AlertCircle className="w-3 h-3" />
                  Se ignorará el formato HTML de las descripciones.
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={reset} 
                    disabled={importando}
                    className="h-9 px-4 rounded-xl text-xs font-bold"
                  >
                    Cambiar archivo
                  </Button>
                  <Button 
                    onClick={ejecutarImportacion}
                    disabled={importando || parsing}
                    className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] h-9 px-6 font-black text-[10px] uppercase tracking-widest rounded-xl"
                  >
                    Comenzar Importación
                  </Button>
                </div>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
