
import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from "@/components/ui/toaster";
import { AppContent } from '@/components/app-content';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
    title: 'FromStore2Door - Shipping from US to Jamaica',
    description: 'Your Bridge Between Florida & Jamaica for seamless, reliable, and affordable shipping services.',
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-body antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AppContent>
            {children}
          </AppContent>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
