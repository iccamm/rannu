import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth';

export const metadata: Metadata = {
  title: 'RANNU — Monitoring Gizi Anak',
  description:
    'Aplikasi monitoring keragaman pangan anak usia 6-23 bulan. The Gold Standard for Early Childhood Nutrition Monitoring.',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.svg?v=2',
    apple: '/logo.svg?v=2',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RANNU',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1a1a4e',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
