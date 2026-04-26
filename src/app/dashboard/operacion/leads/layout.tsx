import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leads de Campañas",
};

export default function LeadsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
