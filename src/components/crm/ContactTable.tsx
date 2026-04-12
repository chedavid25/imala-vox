"use client";

import React from "react";
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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EtiquetaRelacion } from "@/components/ui/EtiquetaRelacion";
import { Contacto } from "@/lib/types/firestore";
import { Shield, ShieldOff, MoreHorizontal, Pencil, Trash2, Mail, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { COLLECTIONS } from "@/lib/types/firestore";
import { cn } from "@/lib/utils";

interface ContactTableProps {
  contactos: (Contacto & { id: string })[];
}

export function ContactTable({ contactos }: ContactTableProps) {
  const { currentWorkspaceId, selectedContactId, setSelectedContactId } = useWorkspaceStore();

  const handleDelete = async (event: React.MouseEvent, id: string) => {
    event.stopPropagation(); // Evitar seleccionar la fila al borrar
    if (!currentWorkspaceId || !confirm("¿Estás seguro de que deseas eliminar este contacto?")) return;
    
    try {
      const contactRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, id);
      await deleteDoc(contactRef);
      if (selectedContactId === id) setSelectedContactId(null);
    } catch (error) {
      console.error("Error eliminando contacto:", error);
      alert("No se pudo eliminar el contacto.");
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-[var(--border-light)] bg-[var(--bg-main)]/30">
            <TableHead className="text-[var(--text-secondary-light)] font-semibold text-[12px] uppercase h-10">Nombre</TableHead>
            <TableHead className="text-[var(--text-secondary-light)] font-semibold text-[12px] uppercase h-10">Teléfono</TableHead>
            <TableHead className="text-[var(--text-secondary-light)] font-semibold text-[12px] uppercase h-10">Email</TableHead>
            <TableHead className="text-[var(--text-secondary-light)] font-semibold text-[12px] uppercase h-10">Cumpleaños</TableHead>
            <TableHead className="text-[var(--text-secondary-light)] font-semibold text-[12px] uppercase h-10">Relación</TableHead>
            <TableHead className="text-[var(--text-secondary-light)] font-semibold text-[12px] uppercase h-10">IA</TableHead>
            <TableHead className="text-[var(--text-secondary-light)] font-semibold text-[12px] uppercase h-10 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contactos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center text-[var(--text-tertiary-light)] text-[13px]">
                No se encontraron contactos.
              </TableCell>
            </TableRow>
          ) : (
            contactos.map((contacto) => (
              <TableRow 
                key={contacto.id} 
                className={cn(
                  "border-[var(--border-light)] transition-colors group cursor-pointer",
                  selectedContactId === contacto.id 
                    ? "bg-[var(--accent)]/10 hover:bg-[var(--accent)]/15" 
                    : "hover:bg-[var(--bg-main)]/50"
                )}
                onClick={() => setSelectedContactId(contacto.id)}
              >
                <TableCell className="font-semibold text-[var(--text-primary-light)] text-[13px]">
                  {contacto.nombre}
                </TableCell>
                <TableCell className="text-[var(--text-secondary-light)] text-[13px] font-medium">
                  {contacto.telefono}
                </TableCell>
                <TableCell className="text-[var(--text-tertiary-light)] text-[13px]">
                  {contacto.email ? (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3" />
                      {contacto.email}
                    </div>
                  ) : "-"}
                </TableCell>
                <TableCell className="text-[var(--text-tertiary-light)] text-[13px]">
                   {contacto.fechaNacimiento ? (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {contacto.fechaNacimiento}
                    </div>
                  ) : "-"}
                </TableCell>
                <TableCell>
                  <EtiquetaRelacion tipo={contacto.relacionTag} />
                </TableCell>
                <TableCell>
                  {contacto.aiBlocked ? (
                    <div className="flex items-center gap-1.5 text-[var(--error)] text-[12px] font-bold">
                      <ShieldOff className="w-3.5 h-3.5" />
                      BLOQUEADA
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[var(--success)] text-[12px] font-bold">
                      <Shield className="w-3.5 h-3.5" />
                      ACTIVA
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--text-tertiary-light)] hover:text-[var(--text-primary-light)]">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[var(--bg-card)] border-[var(--border-light)]">
                      <DropdownMenuLabel className="text-[11px] font-bold uppercase text-[var(--text-tertiary-light)]">Opciones</DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-[var(--border-light)]" />
                      <DropdownMenuItem className="text-[13px] text-[var(--text-primary-light)] focus:bg-[var(--bg-main)] cursor-pointer">
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar contacto
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => handleDelete(e, contacto.id)}
                        className="text-[13px] text-[var(--error)] focus:bg-[var(--error)]/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
