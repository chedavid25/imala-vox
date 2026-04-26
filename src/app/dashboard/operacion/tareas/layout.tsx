import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tareas",
};

export default function TareasLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
