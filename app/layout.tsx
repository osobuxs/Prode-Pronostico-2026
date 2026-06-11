import type { Metadata } from "next";
import "./globals.css";
import { Footer } from "../components/Footer";

export const metadata: Metadata = {
  title: "Prode Mundial 2026",
  description:
    "Pronósticos de varias fuentes, consenso y resultado real de los partidos del Mundial 2026.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {children}
        <Footer />
      </body>
    </html>
  );
}
