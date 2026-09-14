// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { SystemProvider } from './context/systemcontext';
import { AuthProvider } from '@/context/AuthContext';

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
        <AuthProvider>
          <SystemProvider>
            {children}
          </SystemProvider>
        </AuthProvider>
      </body>
    </html>
  );
}