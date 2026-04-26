import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mi Perfil",
};

export default function PerfilLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
