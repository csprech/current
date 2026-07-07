import type { Metadata } from "next";
import "./globals.css";
import { Toast } from "@/components/Toast";

export const metadata: Metadata = {
  title: "iris — See what you say.",
  description: "The creative canvas where a sentence becomes an image, a scene, a film. A node-based studio for image, video, audio, and 3D generation — local-first, bring your own models.",
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
