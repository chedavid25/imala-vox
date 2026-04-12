"use client";

import React, { useState } from "react";
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
import { EtiquetaRelacion } from "@/components/ui/EtiquetaRelacion";
import { Contacto } from "@/lib/types/firestore";
import { Shield, ShieldOff, MoreHorizontal, Pencil, Trash2, Mail, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { COLLECTIONS } from "@/lib/types/firestore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ContactTableProps {
  contactos: (Contacto & { id: string })[];
}

export function ContactTable({ contactos }: ContactTableProps) {
  const { currentWorkspaceId, selectedContactId, setSelectedContactId } = useWorkspaceStore();
  
  // Estado para edición
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingContact, setEditingContact] = useState<(Contacto & { id: string }) | null>(null);

  const handleDelete = async (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    if (!currentWorkspaceId) return;
    
    if (!confirm("¿Estás seguro de que deseas eliminar este contacto?")) return;
    
    const promise = deleteDoc(doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, id));

    toast.promise(promise, {
      loading: 'Eliminando contacto...',
      success: 'Contacto eliminado correctamente',
      error: 'No se pudo eliminar el contacto',
    });

    try {
      await promise;
      if (selectedContactId === id) setSelectedContactId(null);
    } catch (error) {
      console.error("Error eliminando contacto:", error);
    }
  };

  const handleEditClick = (event: React.MouseEvent, contacto: Contacto & { id: string }) => {
    event.stopPropagation();
    setEditingContact({ ...contacto });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!currentWorkspaceId || !editingContact) return;
    
    setIsSaving(true);
    const contactRef = doc(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS, editingContact.id);
    
    try {
      const aiBlocked = editingContact.relacionTag === 'Personal';
      
      const updatePromise = updateDoc(contactRef, {
        nombre: editingContact.nombre,
        telefono: editingContact.telefono,
        email: editingContact.email || "",
        fechaNacimiento: editingContact.fechaNacimiento || "",
        relacionTag: editingContact.relacionTag,
        aiBlocked
      });

      toast.promise(updatePromise, {
        loading: 'Guardando cambios...',
        success: 'Contacto actualizado correctamente',
        error: 'Error al actualizar contacto',
      });

      await updatePromise;
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error actualizando contacto:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
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
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--text-tertiary-light)] hover:text-[var(--text-primary-light)]">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      } />
                      <DropdownMenuContent align="end" className="bg-[var(--bg-card)] border-[var(--border-light)]">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel className="text-[11px] font-bold uppercase text-[var(--text-tertiary-light)]">Opciones</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-[var(--border-light)]" />
                          <DropdownMenuItem 
                            onClick={(e) => handleEditClick(e, contacto)}
                            className="text-[13px] text-[var(--text-primary-light)] focus:bg-[var(--bg-main)] cursor-pointer"
                          >
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
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Diálogo de Edición */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[var(--bg-card)] border-[var(--border-light)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary-light)]">Editar Contacto</DialogTitle>
            <DialogDescription className="text-[var(--text-secondary-light)]">
              Modifica los datos del contacto. La IA se ajustará según la relación.
            </DialogDescription>
          </DialogHeader>
          
          {editingContact && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right text-[13px] text-[var(--text-secondary-light)]">Nombre</Label>
                <Input 
                  id="edit-name" 
                  value={editingContact.nombre}
                  onChange={(e) => setEditingContact({...editingContact, nombre: e.target.value})}
                  className="col-span-3 h-9 bg-[var(--bg-input)] border-[var(--border-light)]" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-phone" className="text-right text-[13px] text-[var(--text-secondary-light)]">Teléfono</Label>
                <Input 
                  id="edit-phone" 
                  value={editingContact.telefono}
                  onChange={(e) => setEditingContact({...editingContact, telefono: e.target.value})}
                  className="col-span-3 h-9 bg-[var(--bg-input)] border-[var(--border-light)]" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-email" className="text-right text-[13px] text-[var(--text-secondary-light)]">Email</Label>
                <Input 
                  id="edit-email" 
                  type="email"
                  value={editingContact.email || ""}
                  onChange={(e) => setEditingContact({...editingContact, email: e.target.value})}
                  className="col-span-3 h-9 bg-[var(--bg-input)] border-[var(--border-light)]" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-birthday" className="text-right text-[13px] text-[var(--text-secondary-light)]">Cumpleaños</Label>
                <Input 
                  id="edit-birthday" 
                  type="date"
                  value={editingContact.fechaNacimiento || ""}
                  onChange={(e) => setEditingContact({...editingContact, fechaNacimiento: e.target.value})}
                  className="col-span-3 h-9 bg-[var(--bg-input)] border-[var(--border-light)]" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-tag" className="text-right text-[13px] text-[var(--text-secondary-light)]">Relación</Label>
                <div className="col-span-3">
                  <Select 
                    value={editingContact.relacionTag}
                    onValueChange={(v: any) => setEditingContact({...editingContact, relacionTag: v})}
                  >
                    <SelectTrigger className="h-9 bg-[var(--bg-input)] border-[var(--border-light)]">
                      <SelectValue placeholder="Selecciona el tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--bg-card)] border-[var(--border-light)]">
                      <SelectItem value="Lead">Lead (Cliente)</SelectItem>
                      <SelectItem value="Laboral">Laboral (Colega)</SelectItem>
                      <SelectItem value="Personal">Personal (Privado)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
              className="border-[var(--border-light)] text-[var(--text-secondary-light)]"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdate} 
              disabled={isSaving || !editingContact?.nombre || !editingContact?.telefono}
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)]"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
