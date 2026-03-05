import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { PWAProvider } from "@/components/providers/PWAProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KK Fit — Seu Painel de Saúde",
  description:
    "Conecte-se ao Google Fit e visualize suas estatísticas de saúde, gráficos e tendências personalizadas.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KK Fit",
    startupImage: [
      {
        url: "/icons/icon-192x192.png",
        media: "(device-width: 768px) and (device-height: 1024px)",
      },
    ],
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192" },
      { url: "/icons/icon-512x512.png", sizes: "512x512" },
    ],
  },
  applicationName: "KK Fit",
  authors: [{ name: "KK Fit" }],
  keywords: ["saúde", "fitness", "google fit", "exercício", "bem-estar"],
  category: "health",
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <QueryProvider>
            <PWAProvider>{children}</PWAProvider>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
