import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SwiftRoute',
  description: 'Backend for a shipping/courier service website.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        ></link>
      </head>
      <body className="font-body antialiased">
          {children}
        <Toaster />
      </body>
    </html>
  );
}

import { Toaster } from "@/components/ui/toaster";
