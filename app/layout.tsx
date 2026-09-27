import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ReformAI", template: "%s · ReformAI" },
  description:
    "Controle de reformas nas unidades: ART/RRT, documentos e liberação da obra.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
