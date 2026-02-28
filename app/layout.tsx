import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Blueprint AI — AI-Powered Floor Plan Generator',
  description:
    'Generate, visualize, and refine house floor plans using AI. Export to DXF (AutoCAD) and JPG.',
  keywords: ['floor plan', 'AI', 'house design', 'CAD', 'architecture'],
  openGraph: {
    title: 'Blueprint AI',
    description: 'AI-powered floor plan generator',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
