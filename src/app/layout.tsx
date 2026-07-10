import type { Metadata } from "next";
import "./globals.css";
import { Toast } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Current — Creative workflows in motion",
  description: "A desktop creative canvas for building and running image, video, audio, text, and 3D workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Toast />
      </body>
    </html>
  );
}
