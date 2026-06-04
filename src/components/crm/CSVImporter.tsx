import React, { useRef } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Upload, FileText } from "lucide-react";
import { Contacto } from "@/lib/types/firestore";
import { Timestamp } from "firebase/firestore";

interface CSVImporterProps {
  onImport: (contactos: Partial<Contacto>[]) => void;
  triggerButton?: React.ReactNode;
}

export function CSVImporter({ onImport, triggerButton }: CSVImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mappedContacts = results.data.map((row: any) => {
          // Normalización para búsqueda flexible de encabezados
          const getValue = (labels: string[]) => {
            const keys = Object.keys(row);
            const foundKey = keys.find(k => 
              labels.some(l => k.toLowerCase().trim() === l.toLowerCase().trim())
            );
            return foundKey ? row[foundKey] : null;
          };

          // Mapeo Inteligente Extendido
          const nombreDirecto = getValue(["Name", "Nombre", "Display Name", "Full Name", "Complete Name"]);
          const nombreParticionado = `${getValue(["Given Name", "First Name", "Nombre Pila"]) || ""} ${getValue(["Family Name", "Last Name", "Apellido"]) || ""}`.trim();
          
          const nombre = nombreDirecto || nombreParticionado || "Sin Nombre";

          const rawTelefono = getValue([
            "Mobile", "Phone", "Teléfono", "Celular", 
            "Phone 1 - Value", "Mobile Phone", "Primary Phone"
          ]) || "";
          const telefono = String(rawTelefono).replace(/\D/g, "");


          const email = getValue([
            "Email", "E-mail", "Correo", "Correo electrónico", 
            "E-mail 1 - Value", "Email Address"
          ]) || "";

          return {
            nombre: String(nombre),
            telefono: String(telefono),
            email: String(email),
            relacionTag: 'Lead' as const,
            aiBlocked: false,
            creadoEl: Timestamp.now(),
          };
        });

        onImport(mappedContacts);
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
      error: (error) => {
        console.error("Error parseando CSV:", error);
      }
    });
  };

  return (
    <div>
      <input
        type="file"
        accept=".csv"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      {triggerButton ? (
        <div onClick={() => fileInputRef.current?.click()}>{triggerButton}</div>
      ) : (
        <Button 
          variant="outline" 
          size="sm" 
          className="h-9 border-[var(--border-light)] text-[var(--text-secondary-light)] hover:text-[var(--text-primary-light)]"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4 mr-2" />
          Importar CSV
        </Button>
      )}
    </div>
  );
}
