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
  viewportFit: "cover",
  themeColor: "#1F1F1E",
};

import { Toaster } from "@/components/ui/sonner";
import Script from "next/script";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
  const fbPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable} overflow-y-auto scroll-smooth`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="antialiased overflow-y-auto" suppressHydrationWarning>
        {/* Google Analytics - Optimizado */}
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="lazyOnload"
            />
            <Script id="google-analytics" strategy="lazyOnload">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}

        {/* Meta Pixel - Optimizado */}
        {fbPixelId && (
          <Script id="fb-pixel" strategy="lazyOnload">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${fbPixelId}');
              fbq('track', 'PageView');
            `}
          </Script>
        )}

        <PwaRegister />
        <AppLayout>
          {children}
        </AppLayout>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
