import "./globals.css";
import { Inter } from "next/font/google";
import { SystemProvider } from "./context/systemcontext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Enterprise Hub",
  description: "Signal Management Automation",
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