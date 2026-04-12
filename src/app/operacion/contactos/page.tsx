"use client";

import React, { useState } from "react";
import { ContactTable } from "@/components/crm/ContactTable";
import { CSVImporter } from "@/components/crm/CSVImporter";
import { useContactos } from "@/hooks/useContactos";
import { Plus, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase";
import { collection, doc, writeBatch, Timestamp, addDoc } from "firebase/firestore";
import { COLLECTIONS, Contacto } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ContactosPage() {
  const { contactos, loading } = useContactos();
  const { currentWorkspaceId } = useWorkspaceStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Estado del formulario de nuevo contacto
  const [newContact, setNewContact] = useState({
    nombre: "",
    telefono: "",
    email: "",
    relacionTag: "Lead" as "Personal" | "Laboral" | "Lead",
  });

  const filteredContactos = contactos.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.telefono.includes(searchTerm)
  );

  const handleBulkImport = async (newContacts: Partial<Contacto>[]) => {
    if (!currentWorkspaceId || newContacts.length === 0) return;
    
    setIsImporting(true);
    try {
      const batch = writeBatch(db);
      const contactsRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS);
      
      newContacts.forEach((contactData) => {
        const newDocRef = doc(contactsRef);
        // Regla Crítica: aiBlocked si es Personal
        const aiBlocked = contactData.relacionTag === 'Personal';
        
        batch.set(newDocRef, {
          ...contactData,
          aiBlocked,
          creadoEl: Timestamp.now()
        });
      });

      await batch.commit();
      console.log(`${newContacts.length} contactos importados exitosamente.`);
    } catch (error) {
      console.error("Error en importación masiva:", error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleManualAdd = async () => {
    if (!currentWorkspaceId || !newContact.nombre || !newContact.telefono) return;
    
    setIsAdding(true);
    try {
      const contactsRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS);
      const aiBlocked = newContact.relacionTag === 'Personal';

      await addDoc(contactsRef, {
        ...newContact,
        aiBlocked,
        creadoEl: Timestamp.now()
      });

      setNewContact({ nombre: "", telefono: "", email: "", relacionTag: "Lead" });
    } catch (error) {
      console.error("Error agregando contacto manual:", error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-[var(--text-primary-light)] tracking-tight">Contactos</h1>
          <p className="text-[13px] text-[var(--text-secondary-light)]">Gestión de CRM y segmentación inteligente de audiencia.</p>
        </div>
        <div className="flex items-center gap-3">
          <CSVImporter onImport={handleBulkImport} />
          
          <Dialog>
            <DialogTrigger 
              render={
                <Button className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] h-10 px-5 shadow-lg shadow-[var(--accent)]/20">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Contacto
                </Button>
              }
            />
            <DialogContent className="sm:max-w-[425px] bg-[var(--bg-card)] border-[var(--border-light)]">
              <DialogHeader>
                <DialogTitle className="text-[var(--text-primary-light)]">Agregar Contacto</DialogTitle>
                <DialogDescription className="text-[var(--text-secondary-light)]">
                  Ingresa los datos del nuevo contacto. Se aplicará bloqueo de IA si es personal.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right text-[13px] text-[var(--text-secondary-light)]">Nombre</Label>
                  <Input 
                    id="name" 
                    value={newContact.nombre}
                    onChange={(e) => setNewContact({...newContact, nombre: e.target.value})}
                    className="col-span-3 h-9 bg-[var(--bg-input)] border-[var(--border-light)]" 
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right text-[13px] text-[var(--text-secondary-light)]">Teléfono</Label>
                  <Input 
                    id="phone" 
                    value={newContact.telefono}
                    onChange={(e) => setNewContact({...newContact, telefono: e.target.value})}
                    className="col-span-3 h-9 bg-[var(--bg-input)] border-[var(--border-light)]" 
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="tag" className="text-right text-[13px] text-[var(--text-secondary-light)]">Relación</Label>
                  <div className="col-span-3">
                    <Select 
                      value={newContact.relacionTag}
                      onValueChange={(v: any) => setNewContact({...newContact, relacionTag: v})}
                    >
                      <SelectTrigger className="h-9 bg-[var(--bg-input)] border-[var(--border-light)]">
                        <SelectValue placeholder="Selecciona el tipo" />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--bg-card)] border-[var(--border-light)]">
                        <SelectItem value="Lead">Lead</SelectItem>
                        <SelectItem value="Laboral">Laboral</SelectItem>
                        <SelectItem value="Personal">Personal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose
                  render={
                    <Button 
                      onClick={handleManualAdd} 
                      disabled={isAdding || !newContact.nombre || !newContact.telefono}
                      className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)]"
                    >
                      {isAdding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Guardar Contacto
                    </Button>
                  }
                />
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border-light)] rounded-xl px-4 py-3 shadow-sm">
        <Search className="w-4 h-4 text-[var(--text-tertiary-light)]" />
        <Input 
          placeholder="Buscar por nombre o teléfono..." 
          className="border-none bg-transparent h-6 focus-visible:ring-0 text-sm p-0 shadow-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading || isImporting ? (
        <div className="h-64 flex flex-col items-center justify-center text-[var(--text-tertiary-light)] gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          <p className="text-sm font-medium">{isImporting ? "Procesando importación masiva..." : "Cargando contactos..."}</p>
        </div>
      ) : (
        <ContactTable contactos={filteredContactos} />
      )}
    </div>
  );
}
