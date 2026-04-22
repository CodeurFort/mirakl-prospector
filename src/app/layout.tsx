import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mirakl Connect Prospector",
  description: "Outil de prospection intelligent pour Mirakl Connect",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex">
        {/* Sidebar */}
        <aside className="w-64 bg-foreground text-background flex flex-col shrink-0">
          <div className="p-6 border-b border-white/10">
            <h1 className="text-lg font-bold tracking-tight">
              Mirakl Connect
            </h1>
            <p className="text-sm opacity-60 mt-1">Prospector</p>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            <NavLink href="/" icon="📊">
              Dashboard
            </NavLink>
            <NavLink href="/research" icon="🔍">
              Marketplace Research
            </NavLink>
            <NavLink href="/campaigns" icon="📧">
              Campagnes
            </NavLink>
          </nav>
          <div className="p-4 border-t border-white/10 text-xs opacity-40">
            Hackathon Mirakl x Eugenia
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-auto">{children}</main>
      </body>
    </html>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-white/10 transition-colors"
    >
      <span>{icon}</span>
      <span>{children}</span>
    </Link>
  );
}
