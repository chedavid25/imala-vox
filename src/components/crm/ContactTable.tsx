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
import { Contacto, EtiquetaCRM, CategoriaCRM } from "@/lib/types/firestore";
import { 
  Shield, 
  ShieldOff, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Mail, 
  Calendar, 
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  History,
  AlertCircle,
  CheckCircle2,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { COLLECTIONS } from "@/lib/types/firestore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { PhoneActionMenu } from "./PhoneActionMenu";

interface ContactTableProps {
  contactos: (Contacto & { id: string })[];
  tags: EtiquetaCRM[];
  categories: CategoriaCRM[];
}

export function ContactTable({ contactos, tags, categories }: ContactTableProps) {
  const { currentWorkspaceId, selectedContactId, setSelectedContactId } = useWorkspaceStore();
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  // Health calculation helper
  const getContactHealth = (contacto: Contacto) => {
    if (!contacto.ultimaInteraccion) return { status: 'none', days: 0 };
    
    const lastDate = contacto.ultimaInteraccion.toDate();
    const daysSince = differenceInDays(new Date(), lastDate);
    
    // Encontrar el umbral más bajo (más restrictivo) entre sus etiquetas
    let minThreshold = 30; // Default
    let hasExplicitLimit = false;

    (contacto.etiquetas || []).forEach(tId => {
      const tag = tags.find(t => t.id === tId);
      if (tag) {
        if (tag.alertaDias) {
          minThreshold = Math.min(minThreshold, tag.alertaDias);
          hasExplicitLimit = true;
        } else {
          const cat = categories.find(c => c.id === tag.categoriaId);
          if (cat?.alertaDiasDefault) {
            minThreshold = Math.min(minThreshold, cat.alertaDiasDefault);
            hasExplicitLimit = true;
          }
        }
      }
    });

    if (daysSince >= minThreshold) return { status: 'rojo', days: daysSince, limit: minThreshold };
    if (daysSince >= (minThreshold - 3)) return { status: 'amarillo', days: daysSince, limit: minThreshold };
    return { status: 'verde', days: daysSince, limit: minThreshold };
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
    <Table className="table-fixed w-full">
      <TableHeader>
        <TableRow className="hover:bg-transparent bg-[var(--bg-main)]/30 border-b border-[var(--border-light)]">
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
          return (
            <TableRow 
              key={contacto.id} 
              className={cn(
                "group cursor-pointer border-b border-[var(--border-light)] transition-all",
                selectedContactId === contacto.id ? "bg-[var(--accent)]/5" : "hover:bg-[var(--bg-main)]/30"
              )}
              onClick={() => setSelectedContactId(contacto.id)}
            >
              <TableCell className="py-4">
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-[var(--text-primary-light)]">{contacto.nombre}</span>
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
                    <span className="text-[12px] font-black text-[var(--text-primary-light)] tabular-nums leading-none mb-1">{health.days} días</span>
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
                 {contacto.aiBlocked ? (
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-rose-50 border border-rose-100 text-[9px] font-black text-rose-500 tracking-wider">
                      <ShieldOff className="size-3" />
                      SILENCIADA
                    </div>
                 ) : (
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-[9px] font-black text-emerald-600 tracking-wider">
                      <Shield className="size-3" />
                      PILOTO
                    </div>
                 )}
              </TableCell>

              <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="size-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
