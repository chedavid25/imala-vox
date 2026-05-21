"use client";

import React, { useState, useRef, useEffect } from "react";
import Papa from "papaparse";
import { db } from "@/lib/firebase";
import { collection, writeBatch, doc, serverTimestamp, Timestamp, getDocs } from "firebase/firestore";
import { COLLECTIONS, Objeto, Agente } from "@/lib/types/firestore";
import { 
  Upload, FileText, CheckCircle2, AlertCircle, Loader2, 
  X, ChevronRight, ShoppingCart, Tag, Image as ImageIcon,
  HelpCircle, ChevronDown, ChevronUp, Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogFooter, DialogDescription 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
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

  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [agenteSeleccionado, setAgenteSeleccionado] = useState<string>("global");
  const [mostrarAyuda, setMostrarAyuda] = useState(false);

  useEffect(() => {
    if (!open || !workspaceId) return;
    
    const cargarAgentes = async () => {
      try {
        const agentesRef = collection(db, COLLECTIONS.ESPACIOS, workspaceId, COLLECTIONS.AGENTES);
        const querySnapshot = await getDocs(agentesRef);
        const lista: Agente[] = [];
        querySnapshot.forEach((doc) => {
          lista.push({ id: doc.id, ...doc.data() } as Agente);
        });
        setAgentes(lista.filter(a => a.activo !== false)); // solo agentes activos
      } catch (error) {
        console.error("Error al cargar agentes:", error);
      }
    };
    
    cargarAgentes();
  }, [open, workspaceId]);

  const reset = () => {
    setFile(null);
    setPreview([]);
    setParsing(false);
    setImportando(false);
    setProgreso(0);
    setAgenteSeleccionado("global");
    setMostrarAyuda(false);
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
          const agenteId = agenteSeleccionado === "global" ? null : agenteSeleccionado;

          // Obtener todos los productos del catálogo existentes en este Workspace para evitar duplicados
          const existentesSnap = await getDocs(
            collection(db, COLLECTIONS.ESPACIOS, workspaceId, COLLECTIONS.OBJETOS)
          );

          const objetoPorSku = new Map<string, string>(); // sku.toLowerCase() -> docId
          const objetoPorTitulo = new Map<string, string>(); // titulo.toLowerCase() -> docId

          existentesSnap.forEach((docSnap) => {
            const d = docSnap.data();
            const sku = d.caracteristicas?.sku;
            const titulo = d.titulo;
            
            if (sku && typeof sku === "string") {
              objetoPorSku.set(sku.trim().toLowerCase(), docSnap.id);
            }
            if (titulo && typeof titulo === "string") {
              objetoPorTitulo.set(titulo.trim().toLowerCase(), docSnap.id);
            }
          });

          for (let i = 0; i < total; i += batchSize) {
            const chunk = data.slice(i, i + batchSize);
            const batch = writeBatch(db);

            chunk.forEach((row) => {
              // Mapeo automático de WooCommerce
              const tituloRaw = row.Nombre || row.title || row.nombre || "Sin título";
              const titulo = typeof tituloRaw === "string" ? tituloRaw.trim() : "Sin título";
              const precio = parseFloat(row["Precio normal"] || row.regular_price || row.precio || "0");
              const descripcion = row["Descripción corta"] || row["Descripción"] || row.description || "";
              const fotosStr = row["Imágenes"] || row.images || "";
              const fotos = fotosStr ? fotosStr.split(",").map((s: string) => s.trim()) : [];
              const skuRaw = row.SKU || row.sku || "";
              const sku = typeof skuRaw === "string" ? skuRaw.trim() : "";
              const categoria = row["Categorías"] || row.categories || null;
              const marca = row.Marcas || row.brands || null;

              // Intentar encontrar si ya existe por SKU o por Título
              let idExistente: string | undefined;
              if (sku) {
                idExistente = objetoPorSku.get(sku.toLowerCase());
              }
              if (!idExistente && titulo) {
                idExistente = objetoPorTitulo.get(titulo.toLowerCase());
              }

              let ref;
              let esNuevo = false;
              if (idExistente) {
                ref = doc(db, COLLECTIONS.ESPACIOS, workspaceId, COLLECTIONS.OBJETOS, idExistente);
              } else {
                ref = doc(collection(db, COLLECTIONS.ESPACIOS, workspaceId, COLLECTIONS.OBJETOS));
                esNuevo = true;
              }

              const datosProducto: any = {
                tipo: 'producto',
                titulo,
                precio,
                moneda: 'ARS', // Default para WooCommerce AR
                descripcion: descripcion.replace(/<[^>]*>?/gm, ''), // Limpiar HTML
                fotos,
                caracteristicas: {
                  sku: sku || null,
                  categoria,
                  marca,
                  importado: true,
                  fuente: 'CSV WooCommerce'
                },
                agenteId,
                estado: 'disponible',
                actualizadoEl: serverTimestamp()
              };

              if (esNuevo) {
                datosProducto.creadoEl = serverTimestamp();
              }

              batch.set(ref, datosProducto, { merge: true });
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

          {/* Instructivo de ayuda interactivo */}
          <div className="border border-[var(--border-light)] rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setMostrarAyuda(!mostrarAyuda)}
              className="w-full flex items-center justify-between p-3 bg-[var(--bg-input)]/50 hover:bg-[var(--bg-input)] text-xs font-bold text-[var(--text-secondary-light)] transition-all outline-none"
            >
              <span className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[var(--accent)] animate-pulse" />
                ¿Cómo exportar el CSV desde WooCommerce / WordPress?
              </span>
              {mostrarAyuda ? <ChevronUp className="w-4 h-4 text-[var(--text-tertiary-light)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-tertiary-light)]" />}
            </button>
            {mostrarAyuda && (
              <div className="p-4 bg-[var(--bg-card)] border-t border-[var(--border-light)] text-xs text-[var(--text-secondary-light)] space-y-3">
                <div className="flex gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-bold flex items-center justify-center text-[10px]">1</span>
                  <p>Inicia sesión en tu panel de administración de <strong>WordPress</strong>.</p>
                </div>
                <div className="flex gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-bold flex items-center justify-center text-[10px]">2</span>
                  <p>En el menú lateral izquierdo, ve a <strong>Productos</strong> &gt; <strong>Todos los productos</strong>.</p>
                </div>
                <div className="flex gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-bold flex items-center justify-center text-[10px]">3</span>
                  <p>En la parte superior de la lista de productos, haz clic en el botón <strong>Exportar</strong>.</p>
                </div>
                <div className="flex gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-bold flex items-center justify-center text-[10px]">4</span>
                  <p>Activa la opción <em>&quot;¿Exportar todas las columnas personalizadas?&quot;</em> y haz clic en <strong>Generar CSV</strong>.</p>
                </div>
                <div className="flex gap-2 bg-[var(--accent)]/5 border border-[var(--accent)]/10 rounded-lg p-2.5 mt-1">
                  <AlertCircle className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[var(--text-tertiary-light)]">
                    El archivo CSV generado se descargará en tu computadora. Luego, selecciónalo o arrástralo en la zona inferior para iniciar la importación.
                  </p>
                </div>
              </div>
            )}
          </div>

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

              {/* Selector de Agente */}
              {!importando && (
                <div className="space-y-2 p-4 border border-[var(--border-light)] rounded-xl bg-[var(--bg-input)]/10">
                  <label className="text-[10px] font-black text-[var(--text-tertiary-light)] uppercase tracking-widest block">
                    🤖 Asignar a un Agente IA
                  </label>
                  <Select value={agenteSeleccionado} onValueChange={(val) => setAgenteSeleccionado(val || "global")}>
                    <SelectTrigger className="w-full bg-[var(--bg-card)] border-[var(--border-light)] h-9 text-xs font-medium rounded-xl text-[var(--text-primary-light)]">
                      <SelectValue placeholder="Seleccionar Agente" />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--bg-card)] border-[var(--border-light)] text-xs text-[var(--text-primary-light)] max-h-60 rounded-xl">
                      <SelectItem value="global">
                        🌍 Global (Todos los agentes)
                      </SelectItem>
                      {agentes.map((ag) => (
                        <SelectItem key={ag.id} value={ag.id || ""}>
                          🤖 {ag.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-[var(--text-tertiary-light)]">
                    Los productos importados solo serán visibles y recomendados por el agente seleccionado (o por todos si es Global).
                  </p>
                </div>
              )}

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
