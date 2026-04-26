import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agentes IA",
};

export default function AgentesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
