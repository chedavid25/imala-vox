import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Facturación y Plan",
};

export default function FacturacionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
