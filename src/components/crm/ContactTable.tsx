"use client";

import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Contacto, EtiquetaCRM, CategoriaCRM, COLLECTIONS } from "@/lib/types/firestore";
import { 
  Shield, 
  ShieldOff, 
  MoreHorizontal, 
  Trash2, 
  Loader2,
  Check,
  X,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { doc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
import { PhoneActionMenu } from "./PhoneActionMenu";

interface ContactTableProps {
  contactos: (Contacto & { id: string })[];
  tags: EtiquetaCRM[];
  categories: CategoriaCRM[];
}

export function ContactTable({ contactos, tags, categories }: ContactTableProps) {
  const { currentWorkspaceId, selectedContactId, setSelectedContactId } = useWorkspaceStore();
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Health calculation helper
  const getContactHealth = (contacto: Contacto) => {
    if (!contacto.ultimaInteraccion) return { status: 'none', days: 0 };
    
    const lastDate = contacto.ultimaInteraccion.toDate();
    const daysSince = differenceInDays(new Date(), lastDate);
    
    let minThreshold = 30; // Default

    (contacto.etiquetas || []).forEach(tId => {
      const tag = tags.find(t => t.id === tId);
      if (tag) {
        if (tag.alertaDias) {
          minThreshold = Math.min(minThreshold, tag.alertaDias);
        } else {
          const cat = categories.find(c => c.id === tag.categoriaId);
          if (cat?.alertaDiasDefault) {
            minThreshold = Math.min(minThreshold, cat.alertaDiasDefault);
          }
        }
      }
    });

    if (daysSince >= minThreshold) return { status: 'rojo', days: daysSince, limit: minThreshold };
    if (daysSince >= (minThreshold - 3)) return { status: 'amarillo', days: daysSince, limit: minThreshold };
    return { status: 'verde', days: daysSince, limit: minThreshold };
  };

  const getAiStatus = (contacto: Contacto) => {
    if (contacto.aiBlocked) return { active: false, reason: 'Contacto' };

    for (const tId of (contacto.etiquetas || [])) {
      const tag = tags.find(t => t.id === tId);
      if (tag) {
        if (tag.aiBlocked) return { active: false, reason: tag.nombre };
        const cat = categories.find(c => c.id === tag.categoriaId);
        if (cat?.aiBlocked) return { active: false, reason: cat.nombre };
      }
    }

    return { active: true };
  };

  const handleDeleteContact = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentWorkspaceId || !confirm("¿Estás seguro de eliminar este contacto? Esta acción no se puede deshacer.")) return;
    
    try {
      await deleteDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, id));
      toast.success("Contacto eliminado correctamente");
      const newSelected = new Set(selectedIds);
      newSelected.delete(id);
      setSelectedIds(newSelected);
    } catch (error) {
      toast.error("Error al eliminar el contacto");
    }
  };

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === sortedContactos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedContactos.map(c => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!currentWorkspaceId || selectedIds.size === 0) return;
    if (!confirm(`¿Estás seguro de eliminar ${selectedIds.size} contactos?`)) return;

    setIsBulkDeleting(true);
    const batch = writeBatch(db);
    selectedIds.forEach(id => {
      const ref = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, id);
      batch.delete(ref);
    });

    try {
      await batch.commit();
      toast.success(`${selectedIds.size} contactos eliminados`);
      setSelectedIds(new Set());
    } catch (err) {
      toast.error("Error en la eliminación masiva");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkAddTag = async (tagId: string) => {
    if (!currentWorkspaceId || selectedIds.size === 0) return;
    const batch = writeBatch(db);
    
    selectedIds.forEach(id => {
      const contact = contactos.find(c => c.id === id);
      if (contact) {
        const ref = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, id);
        const currentTags = contact.etiquetas || [];
        if (!currentTags.includes(tagId)) {
          batch.update(ref, {
            etiquetas: [...currentTags, tagId],
            actualizadoEl: serverTimestamp()
          } as any);
        }
      }
    });

    try {
      await batch.commit();
      toast.success(`Etiqueta añadida a ${selectedIds.size} contactos`);
      setSelectedIds(new Set());
    } catch (err) {
      toast.error("Error al actualizar etiquetas");
    }
  };

  const sortedContactos = useMemo(() => {
    let sortableItems = [...(contactos || [])];
    if (sortConfig) {
      sortableItems.sort((a, b) => {
        const aVal = (a as any)[sortConfig.key] || "";
        const bVal = (b as any)[sortConfig.key] || "";
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [contactos, sortConfig]);

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  return (
    <div className="relative">
      <Table className="table-fixed w-full">
        <TableHeader>
          <TableRow className="hover:bg-transparent bg-[var(--bg-main)]/30 border-b border-[var(--border-light)]">
            <TableHead className="w-[50px] py-5">
              <div 
                onClick={toggleAll}
                className={cn(
                  "size-5 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all",
                  selectedIds.size === sortedContactos.length && sortedContactos.length > 0
                    ? "bg-[var(--accent)] border-[var(--accent)]"
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                {selectedIds.size === sortedContactos.length && sortedContactos.length > 0 && <Check className="size-3 text-[var(--accent-text)] stroke-[4px]" />}
                {selectedIds.size > 0 && selectedIds.size < sortedContactos.length && <div className="w-2 h-0.5 bg-[var(--accent)] rounded-full" />}
              </div>
            </TableHead>
            <TableHead className="w-[200px] text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-tertiary-light)] cursor-pointer py-5" onClick={() => requestSort("nombre")}>Nombre</TableHead>
            <TableHead className="w-[140px] text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-tertiary-light)] py-5">Salud Relacional</TableHead>
            <TableHead className="w-[250px] text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-tertiary-light)] py-5">Categorías y Etiquetas</TableHead>
            <TableHead className="w-[120px] text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-tertiary-light)] py-5">IA</TableHead>
            <TableHead className="w-[80px] text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-tertiary-light)] text-right py-5">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedContactos.map((contacto) => {
            const health = getContactHealth(contacto);
            const ai = getAiStatus(contacto);
            return (
              <TableRow 
                key={contacto.id} 
                className={cn(
                  "group cursor-pointer border-b border-[var(--border-light)] transition-all",
                  selectedIds.has(contacto.id) || selectedContactId === contacto.id ? "bg-[var(--accent)]/5" : "hover:bg-[var(--bg-main)]/30"
                )}
                onClick={() => setSelectedContactId(contacto.id)}
              >
                <TableCell className="py-4">
                  <div 
                    onClick={(e) => toggleSelection(contacto.id, e)}
                    className={cn(
                      "size-5 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all",
                      selectedIds.has(contacto.id)
                        ? "bg-[var(--accent)] border-[var(--accent)]"
                        : "border-slate-200 bg-white group-hover:border-slate-300"
                    )}
                  >
                    {selectedIds.has(contacto.id) && <Check className="size-3 text-[var(--accent-text)] stroke-[4px]" />}
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-semibold text-[var(--text-primary-light)]">{contacto.nombre}</span>
                    <div onClick={(e) => e.stopPropagation()}>
                      <PhoneActionMenu 
                        phoneNumber={contacto.telefono} 
                        contactoId={contacto.id} 
                        nombre={contacto.nombre} 
                        className="text-[11px] text-[var(--text-tertiary-light)] font-medium"
                      />
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "size-2.5 rounded-full border border-white shadow-sm ring-1 ring-offset-2",
                      health.status === 'verde' ? "bg-emerald-500 ring-emerald-500/20" :
                      health.status === 'amarillo' ? "bg-amber-500 ring-amber-500/20 animate-pulse" :
                      "bg-rose-500 ring-rose-500/20"
                    )} />
                    <div className="flex flex-col">
                      <span className="text-[12px] font-semibold text-[var(--text-primary-light)] tabular-nums leading-none mb-1">{health.days} días</span>
                      <span className="text-[9px] text-[var(--text-tertiary-light)] font-bold uppercase tracking-tight">Sin contacto</span>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex flex-wrap gap-1.5 max-w-[240px]">
                    {(contacto.etiquetas || []).slice(0, 3).map(tId => {
                      const tag = tags.find(t => t.id === tId);
                      if (!tag) return null;
                      return (
                        <span 
                          key={tId} 
                          className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border"
                          style={{ backgroundColor: tag.colorBg + '15', color: tag.colorText, borderColor: tag.colorBg + '30' }}
                        >
                          {tag.nombre}
                        </span>
                      );
                    })}
                    {contacto.etiquetas?.length > 3 && (
                      <span className="text-[9px] font-bold text-[var(--text-tertiary-light)] bg-[var(--bg-input)] px-1.5 py-0.5 rounded-full">
                        +{contacto.etiquetas.length - 3}
                      </span>
                    )}
                    {(!contacto.etiquetas || contacto.etiquetas.length === 0) && (
                      <span className="text-[10px] italic text-[var(--text-tertiary-light)]">Sin etiquetas</span>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  {ai.active ? (
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-[9px] font-black text-emerald-600 tracking-wider">
                      <Shield className="size-3" />
                      PILOTO
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-rose-50 border border-rose-100 text-[9px] font-black text-rose-500 tracking-wider">
                      <ShieldOff className="size-3" />
                      {ai.reason ? `OFF (${ai.reason})` : 'SILENCIADA'}
                    </div>
                  )}
                </TableCell>

                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="size-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100 flex items-center justify-center outline-none">
                      <MoreHorizontal className="size-4 text-slate-400" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white border-none shadow-2xl rounded-xl p-1 w-32">
                      <DropdownMenuItem 
                        onClick={(e) => handleDeleteContact(contacto.id, e)}
                        className="text-rose-500 font-bold text-[11px] py-2 rounded-lg cursor-pointer hover:bg-rose-50"
                      >
                        <Trash2 className="size-3.5 mr-2" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Floating Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#1A1A18] text-white px-6 py-4 rounded-[28px] shadow-2xl border border-white/10 flex items-center gap-8 animate-in slide-in-from-bottom-8 duration-300 z-50">
          <div className="flex items-center gap-3 pr-8 border-r border-white/10">
            <div className="size-8 rounded-xl bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center font-black text-sm">
              {selectedIds.size}
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Seleccionados</span>
          </div>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger className="h-10 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all outline-none">
                <Plus className="size-3.5" /> Añadir Etiqueta
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[300px] bg-white text-slate-900 rounded-2xl shadow-2xl p-2 max-h-[400px] overflow-y-auto no-scrollbar border-none">
                {categories.map(cat => (
                  <DropdownMenuGroup key={cat.id} className="mb-2">
                    <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 px-2 py-1.5">{cat.nombre}</DropdownMenuLabel>
                    {tags.filter(t => t.categoriaId === cat.id).map(tag => (
                      <DropdownMenuItem 
                        key={tag.id}
                        onClick={() => handleBulkAddTag(tag.id!)}
                        className="rounded-xl py-2.5 font-bold text-xs cursor-pointer hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-2 rounded-full" style={{ backgroundColor: tag.colorBg }} />
                          {tag.nombre}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              variant="ghost" 
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="h-10 px-4 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
            >
              {isBulkDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              Eliminar {selectedIds.size}
            </Button>
          </div>

          <button 
            onClick={() => setSelectedIds(new Set())}
            className="ml-4 text-slate-500 hover:text-white transition-colors p-1"
          >
            <X className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}
