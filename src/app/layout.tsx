import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Global Hub Admin',
  description: 'Enterprise Admin Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0A0A0F] text-white antialiased">
        {children}
      </body>
    </html>
  );
}