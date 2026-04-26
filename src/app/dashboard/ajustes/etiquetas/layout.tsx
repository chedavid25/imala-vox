import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Etiquetas y Segmentos",
};

export default function EtiquetasLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
