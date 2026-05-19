import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cadmiones",
  description: "Control de vehículos: conductor y cliente",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-6">
            <Link href="/" className="font-bold tracking-tight text-lg">cadmiones</Link>
            <div className="flex gap-4 text-sm">
              <Link href="/" className="hover:underline">Inicio</Link>
              <Link href="/conductor" className="hover:underline">Conductor</Link>
              <Link href="/cliente" className="hover:underline">Cliente</Link>
              <Link href="/combustible" className="hover:underline">Combustible</Link>
            </div>
          </nav>
        </header>
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
