import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "sileo";
import { appFontVariables } from "@/styles/fonts";
import { PwaRegister } from "@/features/shared/presentation/components/pwa/pwa-register";

export const viewport: Viewport = {
  themeColor: "#8c5ff7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Súmate - Voluntariado y Causas Solidarias",
  description:
    "Plataforma comunitaria para descubrir y organizar eventos de voluntariado.",
  applicationName: "Súmate",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Súmate",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={cn(
        "h-full",
        "antialiased",
        appFontVariables,
        "font-sans",
      )}
    >
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <PwaRegister />
        <Toaster
          position="top-center"
          options={{
            fill: "#ffffff",
            roundness: 18,
          }}
        />
      </body>
    </html>
  );
}
