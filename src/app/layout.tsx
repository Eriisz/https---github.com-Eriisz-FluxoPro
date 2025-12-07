import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppLayout } from '@/components/layout/AppLayout';
import { FirebaseClientProvider } from '@/firebase';
import { DataProvider } from '@/context/DataContext';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  title: 'FluxoPro - Gestão Financeira PRO',
  description: 'Controle suas finanças de forma inteligente e automatizada.',
};

const applyTheme = `
  (function() {
    const theme = localStorage.getItem('theme');
    const root = document.documentElement;
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <DataProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </DataProvider>
          <Toaster />
        </FirebaseClientProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
