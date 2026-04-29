import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LOCKSY - Gestión Inteligente para tu Taller",
    template: "%s | LOCKSY",
  },
  description:
    "Software de gestión de talleres para concesionarios de coches. Reserva citas, seguimiento de reparaciones y pagos seguros.",
  openGraph: {
    title: "LOCKSY - Gestión Inteligente para tu Taller",
    description: "La plataforma que conecta concesionarios y clientes. Gestiona citas, reparaciones y pagos de forma sencilla y segura.",
    type: "website",
    locale: "es_ES",
    siteName: "LOCKSY",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="preconnect" href="https://maps.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${montserrat.variable} font-montserrat antialiased`}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
