"use client";

import React, { useRef, useState } from "react";
import Papa from "papaparse";
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, Lead } from "@/lib/types/firestore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Columnas estándar del export de Meta — el resto va a camposFormulario
const META_SYSTEM_COLS = new Set([
  'id', 'created_time',
  'ad_id', 'ad_name',
  'adset_id', 'adset_name',
  'campaign_id', 'campaign_name',
  'form_id', 'form_name',
  'platform', 'retailer_item_id',
]);

const PHONE_KEYS = [
  'phone_number', 'phone', 'telefono', 'celular', 'movil',
  'numero_de_telefono', 'numero_de_celular', 'full_phone_number',
  'phone number', 'full phone number', 'telefono', 'phone', 'tel',
  'celular', 'movil', 'numero de telefono', 'numero de celular',
];

const EMAIL_KEYS = [
  'email', 'email_address', 'correo', 'mail', 'correo_electronico',
  'email address', 'correo electronico',
];

const NAME_KEYS = [
  'full_name', 'nombre', 'name', 'full name', 'nombre completo',
];

const FIRST_NAME_KEYS = ['first_name', 'nombre_pila', 'given_name', 'first name', 'nombre pila'];
const LAST_NAME_KEYS = ['last_name', 'apellido', 'family_name', 'last name', 'apellido'];

interface ParsedRow {
  metaLeadId: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  campana: string;
  formulario: string;
  metaFormId: string;
  camposFormulario: Record<string, string>;
  creadoElMeta: string;
  duplicadoPor: 'metaLeadId' | 'telefono' | 'email' | null;
}

interface MetaLeadsImporterProps {
  leads: (Lead & { id: string })[];
  etapaId: string;
  workspaceId: string;
  onImported: (count: number) => void;
}

export function MetaLeadsImporter({ leads, etapaId, workspaceId, onImported }: MetaLeadsImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const getVal = (row: Record<string, string>, keys: string[]): string | null => {
    const rowKeys = Object.keys(row);
    for (const key of keys) {
      const found = rowKeys.find(k => k.toLowerCase().trim() === key.toLowerCase());
      if (found && row[found]?.trim()) return row[found].trim();
    }
    return null;
  };

  const handleFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, string>[];

        // Construir sets para búsqueda rápida de duplicados
        const existingMetaIds = new Set(leads.map(l => l.metaLeadId).filter(Boolean));
        const existingPhones = new Set(leads.map(l => l.telefono).filter(Boolean));
        const existingEmails = new Set(leads.map(l => l.email).filter(Boolean));

        const parsed: ParsedRow[] = rows.map(row => {
          const metaLeadId = row['id']?.trim() || '';
          const campana = row['campaign_name']?.trim() || '';
          const formulario = row['form_name']?.trim() || '';
          const metaFormId = row['form_id']?.trim() || '';
          const creadoElMeta = row['created_time']?.trim() || '';

          // Nombre
          const nombreDirecto = getVal(row, NAME_KEYS);
          const primerNombre = getVal(row, FIRST_NAME_KEYS) || '';
          const apellido = getVal(row, LAST_NAME_KEYS) || '';
          const nombre = nombreDirecto || `${primerNombre} ${apellido}`.trim() || 'Sin nombre';

          // Teléfono y email
          const telefono = getVal(row, PHONE_KEYS);
          const email = getVal(row, EMAIL_KEYS);

          // Todos los campos no-sistema van a camposFormulario
          const camposFormulario: Record<string, string> = {};
          for (const [k, v] of Object.entries(row)) {
            const keyNorm = k.toLowerCase().trim();
            if (!META_SYSTEM_COLS.has(keyNorm) && v?.trim()) {
              camposFormulario[k.toUpperCase()] = v.trim();
            }
          }

          // Deduplicación inteligente
          let duplicadoPor: ParsedRow['duplicadoPor'] = null;
          if (metaLeadId && existingMetaIds.has(metaLeadId)) {
            duplicadoPor = 'metaLeadId';
          } else if (telefono && existingPhones.has(telefono)) {
            duplicadoPor = 'telefono';
          } else if (email && existingEmails.has(email)) {
            duplicadoPor = 'email';
          }

          return { metaLeadId, nombre, telefono, email, campana, formulario, metaFormId, camposFormulario, creadoElMeta, duplicadoPor };
        });

        setParsedRows(parsed);
        setIsModalOpen(true);
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
      error: () => toast.error("Error al leer el archivo CSV"),
    });
  };

  const handleImport = async () => {
    const nuevos = parsedRows.filter(r => !r.duplicadoPor);
    if (!nuevos.length || !workspaceId || !etapaId) return;

    setIsImporting(true);
    const toastId = toast.loading(`Importando ${nuevos.length} leads...`);

    try {
      const leadsRef = collection(db, COLLECTIONS.ESPACIOS, workspaceId, COLLECTIONS.LEADS);
      await Promise.all(
        nuevos.map(row => {
          let creadoEl: Timestamp;
          try {
            creadoEl = row.creadoElMeta
              ? Timestamp.fromDate(new Date(row.creadoElMeta))
              : Timestamp.now();
          } catch {
            creadoEl = Timestamp.now();
          }

          return addDoc(leadsRef, {
            origen: 'meta_ads' as const,
            etapaId,
            temperatura: 'frio' as const,
            nombre: row.nombre,
            email: row.email,
            telefono: row.telefono,
            camposFormulario: row.camposFormulario,
            metaLeadId: row.metaLeadId || null,
            metaFormId: row.metaFormId || null,
            campana: row.campana || null,
            formulario: row.formulario || null,
            notas: '',
            convertidoAContacto: false,
            contactoId: null,
            creadoEl,
            actualizadoEl: serverTimestamp(),
          });
        })
      );

      toast.success(`${nuevos.length} leads importados correctamente`, { id: toastId });
      setIsModalOpen(false);
      setParsedRows([]);
      onImported(nuevos.length);
    } catch (err) {
      console.error('[MetaLeadsImporter]', err);
      toast.error("Error al importar los leads", { id: toastId });
    } finally {
      setIsImporting(false);
    }
  };

  const nuevos = parsedRows.filter(r => !r.duplicadoPor);
  const duplicados = parsedRows.filter(r => r.duplicadoPor);

  return (
    <>
      <input
        type="file"
        accept=".csv"
        className="hidden"
        ref={fileInputRef}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        className="h-11 rounded-2xl border border-[var(--border-light)] text-[var(--text-secondary-light)] hover:text-[var(--text-primary-light)] bg-white gap-2 font-bold text-[10px] uppercase tracking-widest px-5"
      >
        <Upload className="w-4 h-4" />
        Importar de Meta
      </Button>

      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open && !isImporting) { setIsModalOpen(false); setParsedRows([]); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[var(--accent)]" />
              Importar Leads de Meta
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-5 py-2">
            {/* Resumen */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Total en archivo" value={parsedRows.length} color="blue" />
              <StatCard label="Nuevos a importar" value={nuevos.length} color="green" />
              <StatCard label="Duplicados omitidos" value={duplicados.length} color="amber" />
            </div>

            {/* Info sobre deduplicación */}
            <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                Se detectan duplicados por <strong>ID de Meta</strong>, <strong>teléfono</strong> o <strong>email</strong>. Los duplicados no se importan.
              </p>
            </div>

            {/* Lista de nuevos */}
            {nuevos.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary-light)] flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> A importar ({nuevos.length})
                </p>
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                  {nuevos.map((row, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white border border-[var(--border-light)] rounded-xl px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[var(--text-primary-light)] truncate">{row.nombre}</p>
                        <p className="text-[10px] text-[var(--text-tertiary-light)] font-medium truncate">
                          {row.telefono || row.email || row.campana || 'Sin datos de contacto'}
                        </p>
                      </div>
                      {row.campana && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                          {row.campana.length > 20 ? row.campana.slice(0, 20) + '…' : row.campana}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lista de duplicados */}
            {duplicados.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary-light)] flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Duplicados omitidos ({duplicados.length})
                </p>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                  {duplicados.map((row, i) => (
                    <div key={i} className="flex items-center gap-3 bg-amber-50/60 border border-amber-100 rounded-xl px-3 py-2.5 opacity-70">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[var(--text-primary-light)] truncate">{row.nombre}</p>
                        <p className="text-[10px] text-amber-700 font-medium">
                          Ya existe · coincide por {row.duplicadoPor === 'metaLeadId' ? 'ID de Meta' : row.duplicadoPor === 'telefono' ? 'teléfono' : 'email'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {parsedRows.length === 0 && (
              <p className="text-sm text-center text-[var(--text-tertiary-light)] py-6">No se encontraron filas en el archivo.</p>
            )}
          </div>

          <DialogFooter className="pt-4 border-t border-[var(--border-light)] mt-2">
            <Button
              variant="ghost"
              onClick={() => { setIsModalOpen(false); setParsedRows([]); }}
              disabled={isImporting}
              className="rounded-xl text-[var(--text-tertiary-light)]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={nuevos.length === 0 || isImporting}
              className="bg-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)] rounded-xl px-8 font-black text-[10px] uppercase tracking-widest gap-2"
            >
              {isImporting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</>
                : <>Importar {nuevos.length} lead{nuevos.length !== 1 ? 's' : ''}</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: 'blue' | 'green' | 'amber' }) {
  const styles = {
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    green: "bg-emerald-50 border-emerald-100 text-emerald-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
  };
  return (
    <div className={cn("rounded-2xl border p-4 text-center", styles[color])}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mt-0.5">{label}</p>
    </div>
  );
}
