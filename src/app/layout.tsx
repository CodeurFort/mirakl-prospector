import type { Metadata } from "next";
import { Roboto_Serif } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const robotoSerif = Roboto_Serif({
  variable: "--font-roboto-serif",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
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
    <html lang="fr" className={`${robotoSerif.variable} h-full antialiased`}>
      <body className="min-h-full flex">
        {/* Sidebar — Mirakl dark */}
        <aside className="w-[260px] bg-primary-dark text-white flex flex-col shrink-0 min-h-screen">
          <div className="px-6 py-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-primary-accent flex items-center justify-center text-sm font-bold">
                M
              </div>
              <div>
                <h1 className="text-[16px] font-bold leading-[26px] tracking-tight">
                  Mirakl Connect
                </h1>
                <p className="text-[12px] opacity-50">Prospector</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            <NavLink href="/" icon={<DashboardIcon />}>
              Dashboard
            </NavLink>
            <NavLink href="/research" icon={<SearchIcon />}>
              Marketplace Research
            </NavLink>
            <NavLink href="/campaigns" icon={<MailIcon />}>
              Campagnes
            </NavLink>
          </nav>
          <div className="p-4 mx-4 mb-4 rounded-lg bg-white/5">
            <p className="text-[12px] font-bold text-primary-accent">Hackathon</p>
            <p className="text-[11px] opacity-50 mt-1">
              Mirakl x Eugenia School 2026
            </p>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-auto bg-primary-bg">{children}</main>
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
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-normal hover:bg-white/10 transition-colors group"
    >
      <span className="text-primary-accent opacity-70 group-hover:opacity-100 transition-opacity">
        {icon}
      </span>
      <span>{children}</span>
    </Link>
  );
}

function DashboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1"/>
      <rect x="14" y="3" width="7" height="5" rx="1"/>
      <rect x="14" y="12" width="7" height="9" rx="1"/>
      <rect x="3" y="16" width="7" height="5" rx="1"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.3-4.3"/>
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  );
}
