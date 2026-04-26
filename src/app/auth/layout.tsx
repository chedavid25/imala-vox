import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acceso",
  description: "Iniciá sesión en tu panel de Imalá Vox para gestionar tus agentes de IA y CRM.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
