import React, { useRef } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Upload, FileText } from "lucide-react";
import { Contacto } from "@/lib/types/firestore";
import { Timestamp } from "firebase/firestore";

interface CSVImporterProps {
  onImport: (contactos: Partial<Contacto>[]) => void;
}

export function CSVImporter({ onImport }: CSVImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mappedContacts = results.data.map((row: any) => {
          // Mapeo Inteligente de Columnas (Google Contacts y Variaciones)
          const nombre = row["Name"] || 
                         row["Nombre"] || 
                         `${row["Given Name"] || ""} ${row["Family Name"] || ""}`.trim() || 
                         row["Display Name"] || 
                         "Sin Nombre";

          const telefono = row["Mobile"] || 
                           row["Phone"] || 
                           row["Teléfono"] || 
                           row["Phone 1 - Value"] || 
                           "";

          const email = row["Email"] || 
                        row["E-mail"] || 
                        row["Correo electrónico"] || 
                        row["E-mail 1 - Value"] || 
                        "";

          // Intento de mapeo de cumpleaños
          const cumple = row["Birthday"] || row["Birthday"] || row["Fecha de nacimiento"] || row["Anniversary"] || "";

          return {
            nombre,
            telefono,
            email,
            relacionTag: 'Lead' as const, // Default para importación, el usuario puede cambiarlo
            aiBlocked: false,
            creadoEl: Timestamp.now(),
            // Aquí podríamos procesar el 'cumple' si quisiéramos guardarlo en un campo específico
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
      <Button 
        variant="outline" 
        size="sm" 
        className="h-9 border-[var(--border-light)] text-[var(--text-secondary-light)] hover:text-[var(--text-primary-light)]"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-4 h-4 mr-2" />
        Importar CSV
      </Button>
    </div>
  );
}
