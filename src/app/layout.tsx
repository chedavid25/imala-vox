import type { Metadata, Viewport } from "next";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";
import AppLayout from "@/components/layout/AppLayout";
import { PwaRegister } from "@/components/layout/PwaRegister";

export const metadata: Metadata = {
  title: {
    default: "Imalá Vox | Agentes IA y CRM Omnicanal",
    template: "%s | Imalá Vox"
  },
  description: "Gestión inteligente de conversaciones para WhatsApp, Instagram y Facebook con IA de última generación.",
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
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable} overflow-y-auto scroll-smooth`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="antialiased overflow-y-auto" suppressHydrationWarning>
        <PwaRegister />
        <AppLayout>
          {children}
        </AppLayout>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
