"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import createGlobe from "cobe";

// Country code → [lat, lng]
const COUNTRY_COORDS: Record<string, [number, number]> = {
  FR: [46.6, 2.3],
  DE: [51.2, 10.4],
  UK: [52.5, -1.2],
  US: [39, -98],
  IT: [42.5, 12.5],
  ES: [40.4, -3.7],
  NL: [52.1, 5.3],
  BE: [50.8, 4.4],
  SE: [62.0, 18.0],
  DK: [56.3, 9.5],
  AT: [47.7, 14.6],
  PL: [51.9, 19.1],
  EU: [50, 10],
  CH: [46.8, 8.2],
};

const MARKETPLACES = [
  { name: "Zalando", lat: 52.52, lng: 13.4, region: "EU" },
  { name: "La Redoute", lat: 50.63, lng: 3.06, region: "EU" },
  { name: "Galeries Lafayette", lat: 48.87, lng: 2.34, region: "EU" },
  { name: "John Lewis", lat: 51.51, lng: -0.14, region: "EU" },
  { name: "Debenhams", lat: 51.52, lng: -0.15, region: "EU" },
  { name: "Bloomingdales", lat: 40.76, lng: -73.97, region: "US" },
  { name: "Nordstrom", lat: 47.61, lng: -122.33, region: "US" },
];

// Colors as [r,g,b] 0-1
const BLUE: [number, number, number] = [0.153, 0.392, 1.0];
const PINK: [number, number, number] = [0.949, 0.18, 0.459];

interface SellerPoint {
  id: string;
  name: string;
  country: string;
  score: number;
  marketplace: string;
}

interface Globe3DProps {
  sellers: SellerPoint[];
  onSellerClick?: (id: string) => void;
  onMarketplaceClick?: (name: string) => void;
}

export default function Globe3D({
  sellers,
  onMarketplaceClick,
}: Globe3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const phiOffset = useRef(0);
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null);
  const animRef = useRef<number>(0);
  const [hoveredMp, setHoveredMp] = useState<string | null>(null);

  // Group sellers by country
  const sellersByCountry = useMemo(() => {
    const map: Record<string, SellerPoint[]> = {};
    for (const s of sellers) {
      const code = s.country || "EU";
      if (!map[code]) map[code] = [];
      map[code].push(s);
    }
    return map;
  }, [sellers]);

  // Build cobe markers
  const markers = useMemo(() => {
    const sellerMarkers = Object.entries(sellersByCountry)
      .map(([code, group]) => {
        const coords = COUNTRY_COORDS[code];
        if (!coords) return null;
        return {
          location: coords as [number, number],
          size: Math.max(0.03, Math.min(0.1, group.length * 0.006)),
          color: BLUE,
        };
      })
      .filter(Boolean) as { location: [number, number]; size: number; color: [number, number, number] }[];

    const mpMarkers = MARKETPLACES.map((mp) => ({
      location: [mp.lat, mp.lng] as [number, number],
      size: 0.05,
      color: PINK,
    }));

    return [...sellerMarkers, ...mpMarkers];
  }, [sellersByCountry]);

  // Build arcs: seller country → top marketplace
  const arcs = useMemo(() => {
    return Object.entries(sellersByCountry)
      .map(([code, group]) => {
        const from = COUNTRY_COORDS[code];
        if (!from) return null;
        const mpCounts: Record<string, number> = {};
        group.forEach((s) => {
          if (s.marketplace) mpCounts[s.marketplace] = (mpCounts[s.marketplace] || 0) + 1;
        });
        const topMpName = Object.entries(mpCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (!topMpName) return null;
        const mp = MARKETPLACES.find((m) => m.name.toLowerCase() === topMpName.toLowerCase());
        if (!mp) return null;
        return {
          from: from as [number, number],
          to: [mp.lat, mp.lng] as [number, number],
          color: BLUE,
        };
      })
      .filter(Boolean) as { from: [number, number]; to: [number, number]; color: [number, number, number] }[];
  }, [sellersByCountry]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    pointerInteracting.current = e.clientX;
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
  }, []);

  const onPointerUp = useCallback(() => {
    pointerInteracting.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (pointerInteracting.current !== null) {
      const delta = e.clientX - pointerInteracting.current;
      pointerInteracting.current = e.clientX;
      phiOffset.current += delta * 0.005;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (!container) return;
    const w = container.clientWidth;

    let phi = 0.3; // Start on Europe

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: w * 2,
      height: w * 2,
      phi: 0.3,
      theta: 0.15,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 20000,
      mapBrightness: 2.5,
      baseColor: [0.012, 0.094, 0.184], // #03182F
      markerColor: BLUE,
      glowColor: [0.02, 0.05, 0.12],
      markers,
      arcs,
      arcColor: BLUE,
      arcWidth: 0.4,
      arcHeight: 0.3,
      scale: 1.05,
    });

    globeRef.current = globe;

    // Animation loop
    const animate = () => {
      phi += 0.003;
      phi += phiOffset.current;
      phiOffset.current *= 0.95; // Dampen
      globe.update({ phi, theta: 0.15 });
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      const newW = container.clientWidth;
      globe.update({ width: newW * 2, height: newW * 2 });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      globe.destroy();
      window.removeEventListener("resize", handleResize);
    };
  }, [markers, arcs]);

  return (
    <div className="relative" style={{ background: "#03182F" }}>
      {/* Globe */}
      <div className="relative mx-auto" style={{ maxWidth: 550 }}>
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerOut={onPointerUp}
          onPointerMove={onPointerMove}
          style={{
            cursor: "grab",
            width: "100%",
            aspectRatio: "1",
            contain: "layout paint size",
          }}
        />
        {/* Glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 50% 50%, rgba(39,100,255,0.06) 0%, transparent 55%)",
          }}
        />
      </div>

      {/* Marketplace labels — right side */}
      <div className="absolute top-4 right-4 space-y-1.5">
        <p className="text-[10px] font-bold mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
          MARKETPLACES
        </p>
        {MARKETPLACES.map((mp) => (
          <button
            key={mp.name}
            onClick={() => onMarketplaceClick?.(mp.name)}
            onMouseEnter={() => setHoveredMp(mp.name)}
            onMouseLeave={() => setHoveredMp(null)}
            className="flex items-center gap-2 px-2.5 py-1 rounded text-[11px] font-bold transition-all w-full text-left"
            style={{
              background: hoveredMp === mp.name ? "rgba(39,100,255,0.3)" : "rgba(255,255,255,0.05)",
              color: hoveredMp === mp.name ? "#FFFFFF" : "rgba(255,255,255,0.6)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: mp.region === "US" ? "#F22E75" : "#2764FF" }}
            />
            {mp.name}
          </button>
        ))}
      </div>

      {/* Seller stats — bottom left */}
      <div className="absolute bottom-4 left-4">
        <p className="text-[10px] font-bold mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
          SELLERS PAR PAYS
        </p>
        <div className="space-y-1">
          {Object.entries(sellersByCountry)
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, 5)
            .map(([code, group]) => {
              const avgScore = group.reduce((a, s) => a + s.score, 0) / group.length;
              return (
                <div
                  key={code}
                  className="flex items-center gap-2 text-[11px]"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: avgScore >= 70 ? "#2764FF" : avgScore >= 50 ? "#F59E0B" : "#F22E75",
                    }}
                  />
                  <span className="font-bold" style={{ color: "#FFF" }}>{code}</span>
                  <span>{group.length} sellers</span>
                  <span style={{ color: "#2764FF" }}>avg {Math.round(avgScore)}</span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Legend — bottom right */}
      <div className="absolute bottom-4 right-4 text-[10px] space-y-1" style={{ color: "rgba(255,255,255,0.4)" }}>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: "#2764FF" }} />
          Sellers
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: "#F22E75" }} />
          Marketplaces
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-[1px]" style={{ background: "#2764FF" }} />
          Connexions
        </div>
      </div>
    </div>
  );
}
