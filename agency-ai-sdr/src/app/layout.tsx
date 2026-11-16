import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Agency AI SDR", template: "%s · Agency AI SDR" },
  description: "Prospecção, qualificação e negociação comercial para agência de sites.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
