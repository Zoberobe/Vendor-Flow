import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AppFrame } from '@/components/layout/app-frame';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'VendorFlow',
  description: 'B2B supplier management workspace',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
