import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Canales de Chat",
};

export default function CanalesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
