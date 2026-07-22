import type { Metadata } from "next";
import type { ReactNode } from "react";

import { fr } from "@/lib/i18n/fr";

import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  title: fr.metadata.title,
  description: fr.metadata.description,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
