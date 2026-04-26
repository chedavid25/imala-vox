import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Automatizaciones",
};

export default function WorkflowsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
