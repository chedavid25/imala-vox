import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cerebro IA",
};

export default function CerebroLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
