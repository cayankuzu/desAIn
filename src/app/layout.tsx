import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "desAIn",
  description: "Professional 3D room planning and smart layout editor.",
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
