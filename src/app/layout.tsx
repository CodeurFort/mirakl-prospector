import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MobileNav } from "@/components/MobileNav";
import { TabBar } from "@/components/layout/TabBar";

export const metadata: Metadata = {
  title: "Mirakl Connect Prospector",
  description: "Smart prospection tool for Mirakl Connect",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#03182F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full overflow-hidden flex">
        {/* Sidebar — desktop only */}
        <aside className="hidden lg:flex w-[260px] bg-primary-dark text-white flex-col shrink-0 h-screen sticky top-0">
          <div className="px-6 py-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-primary-accent flex items-center justify-center text-sm font-bold">
                M
              </div>
              <div>
                <h1 className="text-[16px] font-bold leading-[26px] tracking-tight">
                  Mirakl Connect
                </h1>
                <p className="text-[12px] opacity-50">Seller Intelligence</p>
              </div>
            </div>
          </div>
          <TabBar />
          <div className="p-4 mx-4 mb-4 rounded-lg bg-white/5">
            <p className="text-[12px] font-bold text-primary-accent">Hackathon</p>
            <p className="text-[11px] opacity-50 mt-1">
              Mirakl x Eugenia School 2026
            </p>
          </div>
        </aside>

        {/* Mobile nav */}
        <MobileNav />

        {/* Main */}
        <main className="flex-1 h-full overflow-auto bg-primary-bg">{children}</main>
      </body>
    </html>
  );
}
