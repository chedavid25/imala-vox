import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contactos",
};

export default function ContactosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
