import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppLayout } from '@/components/layout/AppLayout';
import { FirebaseClientProvider } from '@/firebase';
import { DataProvider } from '@/context/DataContext';
import { AppearanceProvider } from '@/context/AppearanceContext';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  title: 'FluxoPro - Gestão Financeira PRO',
  description: 'Controle suas finanças de forma inteligente e automatizada.',
};

const applyTheme = `
  (function() {
    const root = document.documentElement;
    const theme = localStorage.getItem('theme');
    const dark = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', dark);
    root.dataset.palette = localStorage.getItem('palette') || 'gold';
    root.dataset.colorblind = localStorage.getItem('colorblind') === '1' ? 'on' : 'off';
    root.dataset.density = localStorage.getItem('compact') === '1' ? 'compact' : 'comfortable';
  })()
`;


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: applyTheme }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Figtree:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <AppearanceProvider>
            <DataProvider>
              <AppLayout>
                {children}
              </AppLayout>
            </DataProvider>
          </AppearanceProvider>
          <Toaster />
        </FirebaseClientProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
