import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Equipo y Usuarios",
};

export default function UsuariosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
