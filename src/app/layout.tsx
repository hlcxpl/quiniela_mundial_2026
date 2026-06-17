import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quiniela Mundial 2026 - Predicciones del Mundial",
  description: "Llena tus predicciones, actualiza marcadores oficiales en tiempo real y simula las eliminatorias en tu quiniela del Mundial de Fútbol 2026.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
