import type { Metadata } from "next";
import { SessionKeepAlive } from "@/components/auth/SessionKeepAlive";
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
        <SessionKeepAlive />
      </body>
    </html>
  );
}
