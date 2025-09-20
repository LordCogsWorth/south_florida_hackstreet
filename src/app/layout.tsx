import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers/Providers';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'E.D.I.T.H. - Enhanced Digital Intelligence for Teaching & Learning',
  description:
    'Real-time lecture companion with live transcription, whiteboard vision, and AI-powered note generation',
  keywords: [
    'education',
    'AI',
    'transcription',
    'learning',
    'lecture',
    'notes',
  ],
  authors: [{ name: 'E.D.I.T.H. Team' }],
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
