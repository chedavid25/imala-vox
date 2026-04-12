"use client";

import React, { useState } from "react";
import { ContactTable } from "@/components/crm/ContactTable";
import { CSVImporter } from "@/components/crm/CSVImporter";
import { useContactos } from "@/hooks/useContactos";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { COLLECTIONS, Contacto } from "@/lib/types/firestore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export default function ContactosPage() {
  const { contactos, loading } = useContactos();
  const { currentWorkspaceId } = useWorkspaceStore();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredContactos = contactos.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.telefono.includes(searchTerm)
  );

  const handleBulkImport = async (newContacts: Partial<Contacto>[]) => {
    if (!currentWorkspaceId) return;
    
    const contactsRef = collection(db, COLLECTIONS.ESPACIOS, currentWorkspaceId, COLLECTIONS.CONTACTOS);
    
    // En una app real usaríamos batch, para este scaffolding hacemos loops simples
    for (const contactData of newContacts) {
      // Regla Crítica: aiBlocked si es Personal
      const aiBlocked = contactData.relacionTag === 'Personal';
      
      await addDoc(contactsRef, {
        ...contactData,
        aiBlocked,
        creadoEl: Timestamp.now()
      });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary-light)]">Contactos</h1>
          <p className="text-[13px] text-[var(--text-secondary-light)]">Gestión de CRM y segmentación de audiencia.</p>
        </div>
        <div className="flex items-center gap-3">
          <CSVImporter onImport={handleBulkImport} />
          <Button className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] h-9">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Contacto
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border-light)] rounded-lg px-3 py-2">
        <Search className="w-4 h-4 text-[var(--text-tertiary-light)]" />
        <Input 
          placeholder="Buscar por nombre o teléfono..." 
          className="border-none bg-transparent h-6 focus-visible:ring-0 text-[13px]"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-[var(--text-tertiary-light)]">
          Cargando contactos...
        </div>
      ) : (
        <ContactTable contactos={filteredContactos} />
      )}
    </div>
  );
}
