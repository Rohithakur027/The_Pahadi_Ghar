import type { Metadata } from 'next';
import { Playfair_Display, DM_Sans } from 'next/font/google';
import './globals.css';
import { HomestayProvider } from '@/context/HomestayContext';
import BottomNav from '@/components/BottomNav';
import { Toaster } from 'react-hot-toast';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'The Pahadi Ghar — Tirthan Valley',
  description: 'Homestay management for Tirthan Valley, Himachal Pradesh',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
<body className="antialiased">
        <HomestayProvider>
          <main className="min-h-screen pb-24 max-w-lg mx-auto">
            {children}
          </main>
          <BottomNav />
          <Toaster
            position="top-center"
            gutter={8}
            toastOptions={{
              duration: 3000,
              style: {
                background: '#FFFDF9',
                color: '#1A1A1A',
                border: '1px solid rgba(212,135,58,0.3)',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: '0 4px 24px rgba(28,58,42,0.12)',
                padding: '12px 16px',
              },
            }}
          />
        </HomestayProvider>
      </body>
    </html>
  );
}
