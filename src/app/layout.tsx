import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "desAIn",
  description: "Professional 3D room planning and layout editor.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <div className="global-brand-credit" aria-label="Copyright 2026, powered by MeMoDe">
          <span>Copyright 2026</span>
          <strong>Powered by MeMoDe</strong>
        </div>
      </body>
    </html>
  );
}
