import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProviderVPJS } from "@/contexts/AuthContextVPJS";
import { AnimalsProviderVPJS } from "@/contexts/AnimalsContextVPJS";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TALON - Sistema de Geofencing para Monitoramento de Áreas",
  description:
    "Crie cercas virtuais e monitore posições em tempo real. Sistema de geofencing inteligente com alertas de entrada e saída, rastreamento de animais e visualização em mapas interativos.",
  keywords: [
    "TALON",
    "Geofencing",
    "Mapas",
    "OpenStreetMap",
    "Next.js",
    "React",
    "Localização",
    "Rastreamento",
    "Monitoramento",
  ],
  authors: [{ name: "TALON Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "TALON - Geofencing Inteligente",
    description:
      "Sistema de geofencing para monitoramento de áreas com cercas virtuais e alertas em tempo real.",
    url: "https://github.com/Joshua-likesjs/TALON",
    siteName: "TALON",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TALON - Geofencing Inteligente",
    description:
      "Sistema de geofencing para monitoramento de áreas com cercas virtuais e alertas em tempo real.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AuthProviderVPJS>
          <AnimalsProviderVPJS>
            {children}
          </AnimalsProviderVPJS>
        </AuthProviderVPJS>
        <Toaster />
      </body>
    </html>
  );
}
