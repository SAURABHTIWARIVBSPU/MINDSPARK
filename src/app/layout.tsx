import type { Metadata } from 'next';
import './globals.css';
import Navigation from '@/components/Navigation';
import AdmitCardHeaderSection from '@/components/AdmitCardHeaderSection';

export const metadata: Metadata = {
  title: 'Mind-Spark 2026 • Official Admit Card & Student Portal',
  description: 'Official candidate hall ticket portal for Mind-Spark 2026 Academic Olympiad. Search, verify, and download your examination Admit Card.',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="antialiased min-h-screen flex flex-col bg-[#101827] text-[#F4F7FC] selection:bg-[#78AFFF]/25 selection:text-[#78AFFF]">
        <Navigation />
        <AdmitCardHeaderSection />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
