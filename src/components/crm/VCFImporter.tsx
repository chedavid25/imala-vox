import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { Contacto } from "@/lib/types/firestore";
import { Timestamp } from "firebase/firestore";

interface VCFImporterProps {
  onImport: (contactos: Partial<Contacto>[]) => void;
  triggerButton?: React.ReactNode;
}

export function VCFImporter({ onImport, triggerButton }: VCFImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const cards = text.split("END:VCARD");
      const mappedContacts: Partial<Contacto>[] = [];

      cards.forEach((card) => {
        const trimmedCard = card.trim();
        if (!trimmedCard) return;

        let nombre = "";
        let telefono = "";
        let email = "";

        const lines = trimmedCard.split(/\r?\n/);
        lines.forEach((line) => {
          const upperLine = line.toUpperCase();
          if (upperLine.startsWith("FN:")) {
            nombre = line.substring(3).trim();
          } else if (upperLine.startsWith("N:") && !nombre) {
            const parts = line.substring(2).split(";");
            const apellido = parts[0] || "";
            const nameVal = parts[1] || "";
            nombre = `${nameVal} ${apellido}`.trim();
          } else if (upperLine.startsWith("TEL;") || upperLine.startsWith("TEL:")) {
            const colonIndex = line.indexOf(":");
            if (colonIndex !== -1) {
              const telVal = line.substring(colonIndex + 1);
              telefono = telVal.replace(/\D/g, "");
            }
          } else if (upperLine.startsWith("EMAIL;") || upperLine.startsWith("EMAIL:")) {
            const colonIndex = line.indexOf(":");
            if (colonIndex !== -1) {
              email = line.substring(colonIndex + 1).trim();
            }
          }
        });

        if (nombre || telefono) {
          mappedContacts.push({
            nombre: nombre || "Sin Nombre",
            telefono: telefono,
            email: email,
            relacionTag: "Lead" as const,
            aiBlocked: false,
            creadoEl: Timestamp.now(),
          });
        }
      });

      onImport(mappedContacts);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    reader.readAsText(file);
  };

  return (
    <div>
      <input
        type="file"
        accept=".vcf"
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
          Importar vCard (iCloud)
        </Button>
      )}
    </div>
  );
}
