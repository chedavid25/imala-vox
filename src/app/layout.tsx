import type { Metadata, Viewport } from "next";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";
import AppLayout from "@/components/layout/AppLayout";
import { PwaRegister } from "@/components/layout/PwaRegister";

export const metadata: Metadata = {
  title: "ImaláVox - SaaS de Gestión de Agentes IA",
  description: "Gestión inteligente de conversaciones para WhatsApp, Instagram y Facebook.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ImaláVox",
    startupImage: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1F1F1E",
};

import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="antialiased overflow-hidden" suppressHydrationWarning>
        <PwaRegister />
        <AppLayout>
          {children}
        </AppLayout>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
