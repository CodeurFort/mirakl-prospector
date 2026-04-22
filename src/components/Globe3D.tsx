"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import createGlobe from "cobe";

const COUNTRY_COORDS: Record<string, [number, number]> = {
  FR: [46.6, 2.3], DE: [51.2, 10.4], UK: [52.5, -1.2], US: [39, -98],
  IT: [42.5, 12.5], ES: [40.4, -3.7], NL: [52.1, 5.3], BE: [50.8, 4.4],
  SE: [62.0, 18.0], DK: [56.3, 9.5], AT: [47.7, 14.6], PL: [51.9, 19.1],
  EU: [50, 10], CH: [46.8, 8.2],
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
  selectedMarketplace?: string;
}

// Project lat/lng to 2D screen coords given globe rotation
function projectToScreen(
  lat: number,
  lng: number,
  phi: number,
  theta: number,
  size: number
): { x: number; y: number; visible: boolean } {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;

  // Convert to 3D point on unit sphere
  const x = Math.cos(latRad) * Math.sin(lngRad + phi);
  const y = -Math.sin(latRad) * Math.cos(theta) + Math.cos(latRad) * Math.sin(theta) * Math.cos(lngRad + phi);
  const z = Math.sin(latRad) * Math.sin(theta) + Math.cos(latRad) * Math.cos(theta) * Math.cos(lngRad + phi);

  // Only visible if facing camera (z > 0 means behind globe)
  const visible = z < 0.2;

  const half = size / 2;
  const scale = 1.05; // Match cobe scale
  return {
    x: half + x * half * scale,
    y: half - y * half * scale,
    visible,
  };
}

export default function Globe3D({
  sellers,
  onSellerClick,
  onMarketplaceClick,
  selectedMarketplace,
}: Globe3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const phiOffset = useRef(0);
  const currentPhi = useRef(0.3);
  const currentTheta = useRef(0.15);
  const animRef = useRef<number>(0);
  const [, forceRender] = useState(0);
  const [hoveredItem, setHoveredItem] = useState<{
    type: "seller" | "marketplace";
    id: string;
    name: string;
    x: number;
    y: number;
    data?: { count: number; avgScore: number; sellers: SellerPoint[] };
  } | null>(null);
  const [containerSize, setContainerSize] = useState(550);

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

  // Cobe markers
  const cobeMarkers = useMemo(() => {
    const sm = Object.entries(sellersByCountry)
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
    const mm = MARKETPLACES.map((mp) => ({
      location: [mp.lat, mp.lng] as [number, number],
      size: 0.05,
      color: PINK,
    }));
    return [...sm, ...mm];
  }, [sellersByCountry]);

  // Arcs
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
        return { from: from as [number, number], to: [mp.lat, mp.lng] as [number, number], color: BLUE };
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
    const container = containerRef.current;
    if (!canvas || !container) return;

    const w = container.clientWidth;
    setContainerSize(w);

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
      baseColor: [0.012, 0.094, 0.184],
      markerColor: BLUE,
      glowColor: [0.02, 0.05, 0.12],
      markers: cobeMarkers,
      arcs,
      arcColor: BLUE,
      arcWidth: 0.4,
      arcHeight: 0.3,
      scale: 1.05,
    });

    let frameCount = 0;
    const animate = () => {
      currentPhi.current += 0.003 + phiOffset.current;
      phiOffset.current *= 0.95;
      globe.update({ phi: currentPhi.current, theta: 0.15 });

      // Re-render overlays every 3 frames for perf
      frameCount++;
      if (frameCount % 3 === 0) {
        forceRender((n) => n + 1);
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      const newW = container.clientWidth;
      setContainerSize(newW);
      globe.update({ width: newW * 2, height: newW * 2 });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      globe.destroy();
      window.removeEventListener("resize", handleResize);
    };
  }, [cobeMarkers, arcs]);

  // Compute projected overlay positions
  const sellerOverlays = useMemo(() => {
    return Object.entries(sellersByCountry).map(([code, group]) => {
      const coords = COUNTRY_COORDS[code];
      if (!coords) return null;
      const { x, y, visible } = projectToScreen(
        coords[0], coords[1], currentPhi.current, currentTheta.current, containerSize
      );
      if (!visible) return null;
      const avgScore = group.reduce((a, s) => a + s.score, 0) / group.length;
      const isHighlighted = selectedMarketplace
        ? group.some((s) => s.marketplace.toLowerCase() === selectedMarketplace.toLowerCase())
        : false;
      return { code, x, y, count: group.length, avgScore, sellers: group, isHighlighted };
    }).filter(Boolean) as {
      code: string; x: number; y: number; count: number; avgScore: number;
      sellers: SellerPoint[]; isHighlighted: boolean;
    }[];
  }, [sellersByCountry, containerSize, selectedMarketplace, forceRender]); // eslint-disable-line

  const mpOverlays = useMemo(() => {
    return MARKETPLACES.map((mp) => {
      const { x, y, visible } = projectToScreen(
        mp.lat, mp.lng, currentPhi.current, currentTheta.current, containerSize
      );
      if (!visible) return null;
      const isSelected = selectedMarketplace?.toLowerCase() === mp.name.toLowerCase();
      return { ...mp, x, y, isSelected };
    }).filter(Boolean) as (typeof MARKETPLACES[0] & { x: number; y: number; isSelected: boolean })[];
  }, [containerSize, selectedMarketplace, forceRender]); // eslint-disable-line

  return (
    <div className="relative" style={{ background: "#03182F" }}>
      <div ref={containerRef} className="relative mx-auto" style={{ maxWidth: 550 }}>
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerOut={onPointerUp}
          onPointerMove={onPointerMove}
          style={{ cursor: "grab", width: "100%", aspectRatio: "1", contain: "layout paint size" }}
        />

        {/* Interactive seller overlays */}
        {sellerOverlays.map((s) => (
          <button
            key={s.code}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: s.x, top: s.y, zIndex: 10 }}
            onMouseEnter={(e) => {
              const rect = containerRef.current?.getBoundingClientRect();
              setHoveredItem({
                type: "seller",
                id: s.code,
                name: s.code,
                x: e.clientX - (rect?.left || 0),
                y: e.clientY - (rect?.top || 0),
                data: { count: s.count, avgScore: s.avgScore, sellers: s.sellers },
              });
            }}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={() => {
              // If only 1 seller, go to their page
              if (s.sellers.length === 1) {
                onSellerClick?.(s.sellers[0].id);
              }
            }}
          >
            {/* Pulse ring for highlighted */}
            {s.isHighlighted && (
              <span
                className="absolute inset-0 rounded-full animate-ping"
                style={{
                  background: "rgba(39,100,255,0.3)",
                  width: Math.max(16, s.count * 3),
                  height: Math.max(16, s.count * 3),
                  margin: "auto",
                }}
              />
            )}
            {/* Dot */}
            <span
              className="block rounded-full transition-all duration-200 group-hover:scale-150"
              style={{
                width: Math.max(8, Math.min(22, s.count * 2.5)),
                height: Math.max(8, Math.min(22, s.count * 2.5)),
                background: s.isHighlighted
                  ? "#FFFFFF"
                  : s.avgScore >= 70 ? "#2764FF" : s.avgScore >= 50 ? "#F59E0B" : "#F22E75",
                boxShadow: `0 0 ${s.count * 2}px ${s.isHighlighted ? "rgba(255,255,255,0.6)" : s.avgScore >= 70 ? "rgba(39,100,255,0.6)" : "rgba(242,46,117,0.6)"}`,
                border: "2px solid rgba(255,255,255,0.3)",
              }}
            />
            {/* Count label */}
            <span
              className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold whitespace-nowrap"
              style={{ color: "rgba(255,255,255,0.8)" }}
            >
              {s.count}
            </span>
          </button>
        ))}

        {/* Interactive marketplace overlays */}
        {mpOverlays.map((mp) => (
          <button
            key={mp.name}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: mp.x, top: mp.y, zIndex: 15 }}
            onClick={() => onMarketplaceClick?.(mp.name)}
            onMouseEnter={() => {
              setHoveredItem({
                type: "marketplace",
                id: mp.name,
                name: mp.name,
                x: mp.x,
                y: mp.y,
              });
            }}
            onMouseLeave={() => setHoveredItem(null)}
          >
            {/* Diamond shape for marketplaces */}
            <span
              className="block transition-all duration-200 group-hover:scale-150"
              style={{
                width: 10,
                height: 10,
                background: mp.isSelected ? "#FFFFFF" : "#F22E75",
                transform: "rotate(45deg)",
                boxShadow: `0 0 8px ${mp.isSelected ? "rgba(255,255,255,0.8)" : "rgba(242,46,117,0.6)"}`,
                border: "1.5px solid rgba(255,255,255,0.4)",
              }}
            />
            {/* Label */}
            <span
              className="absolute top-3 left-1/2 -translate-x-1/2 text-[8px] font-bold whitespace-nowrap"
              style={{ color: mp.isSelected ? "#FFFFFF" : "rgba(255,255,255,0.5)" }}
            >
              {mp.name}
            </span>
          </button>
        ))}

        {/* Tooltip */}
        {hoveredItem && (
          <div
            className="absolute pointer-events-none animate-fade-in"
            style={{
              left: Math.min(hoveredItem.x + 12, containerSize - 220),
              top: Math.max(hoveredItem.y - 10, 10),
              zIndex: 50,
            }}
          >
            <div
              className="rounded-lg p-3"
              style={{
                background: "rgba(3,24,47,0.95)",
                border: "1px solid rgba(39,100,255,0.3)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                minWidth: 180,
              }}
            >
              {hoveredItem.type === "seller" && hoveredItem.data ? (
                <>
                  <p className="text-[12px] font-bold" style={{ color: "#FFFFFF" }}>
                    {hoveredItem.name} — {hoveredItem.data.count} seller{hoveredItem.data.count > 1 ? "s" : ""}
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: "#2764FF" }}>
                    Score moyen : {Math.round(hoveredItem.data.avgScore)}
                  </p>
                  <div className="mt-2 space-y-0.5 max-h-[120px] overflow-y-auto">
                    {hoveredItem.data.sellers.slice(0, 8).map((s) => (
                      <div key={s.id} className="flex justify-between text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                        <span>{s.name}</span>
                        <span style={{ color: s.score >= 70 ? "#2764FF" : s.score >= 50 ? "#F59E0B" : "#F22E75" }}>
                          {s.score}
                        </span>
                      </div>
                    ))}
                    {hoveredItem.data.sellers.length > 8 && (
                      <p className="text-[9px] mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                        +{hoveredItem.data.sellers.length - 8} autres...
                      </p>
                    )}
                  </div>
                  {hoveredItem.data.count === 1 && (
                    <p className="text-[9px] mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Cliquer pour ouvrir la fiche
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-[12px] font-bold" style={{ color: "#F22E75" }}>
                    {hoveredItem.name}
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Cliquer pour filtrer les sellers
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 50% 50%, rgba(39,100,255,0.06) 0%, transparent 55%)",
          }}
        />
      </div>

      {/* Legend — bottom */}
      <div className="flex justify-center gap-6 py-3 text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#2764FF" }} />
          Sellers (hover pour détails)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2" style={{ background: "#F22E75", transform: "rotate(45deg)" }} />
          Marketplaces (click pour filtrer)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-[1px]" style={{ background: "#2764FF" }} />
          Connexions seller → marketplace
        </div>
      </div>
    </div>
  );
}
