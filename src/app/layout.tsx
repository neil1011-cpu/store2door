import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from "@/components/ui/toaster";
import { AppContent } from '@/components/app-content';
import SupabaseProvider from '@/components/supabase-provider';
import { CookieConsent } from '@/components/cookie-consent';

// Self-hosted fonts via Fontsource to prevent build-time network errors
import "@fontsource-variable/sora";
import "@fontsource-variable/dm-sans";

export const metadata: Metadata = {
    title: 'FromStore2Door - Shipping from US to Jamaica',
    description: 'Your Bridge Between Florida & Jamaica for seamless, reliable, and affordable shipping services.',
    icons: {
      icon: '/icon.png',
      apple: '/icon.png',
    },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-body antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <SupabaseProvider>
            <AppContent>
              {children}
            </AppContent>
            <CookieConsent />
          </SupabaseProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
