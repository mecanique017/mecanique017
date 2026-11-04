import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ServiceWorker } from "@/components/service-worker";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Endurance SaaS - Performance & Coaching",
  description: "Plateforme de suivi et de planification pour athlètes d'endurance",
  applicationName: "Endurance",
  // iOS : mode application plein écran une fois ajouté à l'écran d'accueil
  appleWebApp: { capable: true, title: "Endurance", statusBarStyle: "black" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className={`${inter.variable} font-sans bg-background text-foreground antialiased min-h-screen`}>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
