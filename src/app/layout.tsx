import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FitTrack",
  description: "Private workout tracking with friend sharing"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#11151C"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Barlow+Condensed:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans min-h-dvh">{children}</body>
    </html>
  );
}
