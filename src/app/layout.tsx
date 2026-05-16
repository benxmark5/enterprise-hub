import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// Path updated to match your specific folder structure in src/app/context
import { SystemProvider } from "./context/systemcontext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GLOBAL HUB // ENTERPRISE COMMAND",
  description: "Advanced System Management v1.0.4",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#050505] text-white antialiased`}>
        <SystemProvider>
          <main className="min-h-screen">
            {children}
          </main>
        </SystemProvider>
      </body>
    </html>
  );
}