import type { Metadata } from "next";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";
import AppLayout from "@/components/layout/AppLayout";

export const metadata: Metadata = {
  title: "Imalá Vox - SaaS de Gestión de Agentes IA",
  description: "Gestión inteligente de conversaciones para WhatsApp, Instagram y Facebook.",
};

import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="antialiased overflow-hidden">
        <AppLayout>
          {children}
        </AppLayout>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
