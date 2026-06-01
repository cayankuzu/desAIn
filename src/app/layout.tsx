import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "İşin Mutfağı | 3D Oda Editörü",
  description: "Professional 3D room planning and layout editor.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
