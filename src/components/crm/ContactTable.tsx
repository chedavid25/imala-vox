import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EtiquetaRelacion } from "@/components/ui/EtiquetaRelacion";
import { Contacto } from "@/lib/types/firestore";
import { Shield, ShieldOff, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ContactTableProps {
  contactos: (Contacto & { id: string })[];
}

export function ContactTable({ contactos }: ContactTableProps) {
  return (
    <div className="rounded-md border border-[var(--border-light)] bg-[var(--bg-card)]">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-[var(--border-light)]">
            <TableHead className="text-[var(--text-secondary-light)] font-medium text-[13px]">Nombre</TableHead>
            <TableHead className="text-[var(--text-secondary-light)] font-medium text-[13px]">Teléfono</TableHead>
            <TableHead className="text-[var(--text-secondary-light)] font-medium text-[13px]">Relación</TableHead>
            <TableHead className="text-[var(--text-secondary-light)] font-medium text-[13px]">IA</TableHead>
            <TableHead className="text-[var(--text-secondary-light)] font-medium text-[13px] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contactos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-[var(--text-tertiary-light)] text-[13px]">
                No se encontraron contactos.
              </TableCell>
            </TableRow>
          ) : (
            contactos.map((contacto) => (
              <TableRow key={contacto.id} className="border-[var(--border-light)] hover:bg-[var(--bg-main)]/50 transition-colors">
                <TableCell className="font-medium text-[var(--text-primary-light)] text-[13px]">
                  {contacto.nombre}
                </TableCell>
                <TableCell className="text-[var(--text-secondary-light)] text-[13px]">
                  {contacto.telefono}
                </TableCell>
                <TableCell>
                  <EtiquetaRelacion tipo={contacto.relacionTag} />
                </TableCell>
                <TableCell>
                  {contacto.aiBlocked ? (
                    <div className="flex items-center gap-1.5 text-[var(--error)] text-[12px] font-medium">
                      <ShieldOff className="w-3.5 h-3.5" />
                      Bloqueada
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[var(--success)] text-[12px] font-medium">
                      <Shield className="w-3.5 h-3.5" />
                      Activa
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--text-tertiary-light)]">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
