import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProviderVPJS } from "@/contexts/AuthContextVPJS";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GeoFence App - Mapa Interativo com Geofencing",
  description: "Aplicativo de mapas interativo com funcionalidade de Geofencing manual. Desenhe áreas no mapa e verifique sua posição.",
  keywords: ["Geofencing", "Mapas", "OpenStreetMap", "Next.js", "React", "Localização"],
  authors: [{ name: "GeoFence Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "GeoFence App",
    description: "Aplicativo de mapas interativo com geofencing",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AuthProviderVPJS>
          {children}
        </AuthProviderVPJS>
        <Toaster />
      </body>
    </html>
  );
}
