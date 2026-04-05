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
  title: "TALON",
  description: "Sistema de geofencing para monitoramento de áreas. Crie cercas virtuais e verifique posições em tempo real.",
  keywords: ["TALON", "Geofencing", "Mapas", "OpenStreetMap", "Next.js", "React", "Localização"],
  authors: [{ name: "TALON Team" }],
  icons: {
    icon: "/logo.png",
  },
  openGraph: {
    title: "TALON",
    description: "Sistema de geofencing para monitoramento de áreas",
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
