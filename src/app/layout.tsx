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
  title: "T.A.L.O.N.",
  description: "Aplicativo de mapas interativo com funcionalidade de Geofencing manual. Desenhe áreas no mapa e verifique sua posição das coleiras.",
  keywords: ["T.A.L.O.N.", "Mapas", "OpenStreetMap", "Next.js", "React", "Localização"],
  authors: [{ name: "GeoFence Team" }],
  icons: {
    icon: "",
  },
  openGraph: {
    title: "T.A.L.O.N.",
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
