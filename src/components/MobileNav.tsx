"use client";

import { useState } from "react";
import Link from "next/link";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Top bar — mobile only */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
        style={{ background: "#03182F", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded flex items-center justify-center text-[12px] font-bold"
            style={{ background: "#2764FF", color: "#FFFFFF" }}>M</div>
          <span className="text-[14px] font-bold" style={{ color: "#FFFFFF" }}>Mirakl Prospector</span>
        </div>
        <button onClick={() => setOpen(!open)}
          className="w-8 h-8 flex items-center justify-center rounded-lg"
          style={{ background: "rgba(255,255,255,0.06)" }}>
          {open ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18" /><path d="M6 6l12 12" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M3 12h18" /><path d="M3 6h18" /><path d="M3 18h18" />
            </svg>
          )}
        </button>
      </div>

      {/* Dropdown menu */}
      {open && (
        <div className="lg:hidden fixed top-[52px] left-0 right-0 z-50 animate-fade-in"
          style={{ background: "#03182F", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <nav className="p-3 space-y-1">
            {[
              { href: "/", label: "Dashboard", icon: "grid" },
              { href: "/research", label: "Marketplace Research", icon: "search" },
              { href: "/campaigns", label: "Campagnes", icon: "mail" },
            ].map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-[14px] font-bold transition-colors"
                style={{ color: "rgba(255,255,255,0.8)" }}>
                <span className="w-2 h-2 rounded-full" style={{ background: "#2764FF" }} />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="px-4 py-3 mx-3 mb-3 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
            <p className="text-[11px] font-bold" style={{ color: "#2764FF" }}>Hackathon Mirakl x Eugenia School 2026</p>
          </div>
        </div>
      )}

      {/* Overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)} />
      )}
    </>
  );
}
