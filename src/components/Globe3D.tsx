"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import createGlobe from "cobe";

const COUNTRY_COORDS: Record<string, [number, number]> = {
  FR: [46.6, 2.3],
  DE: [51.2, 10.4],
  UK: [52.5, -1.2],
  IT: [42.5, 12.5],
  ES: [40.4, -3.7],
  NL: [52.1, 5.3],
  BE: [50.8, 4.4],
  SE: [62.0, 18.0],
  DK: [56.3, 9.5],
  AT: [47.7, 14.6],
  PL: [51.9, 19.1],
  CH: [46.8, 8.2],
  EU: [50, 10],
};

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
  onCountryClick?: (code: string) => void;
  selectedMarketplace?: string;
  theme?: "dark" | "light";
}

function projectToScreen(lat: number, lng: number, phi: number, theta: number, size: number) {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const x = Math.cos(latRad) * Math.sin(lngRad + phi);
  const y =
    -Math.sin(latRad) * Math.cos(theta) +
    Math.cos(latRad) * Math.sin(theta) * Math.cos(lngRad + phi);
  const z =
    Math.sin(latRad) * Math.sin(theta) +
    Math.cos(latRad) * Math.cos(theta) * Math.cos(lngRad + phi);
  const half = size / 2;
  return {
    x: half + x * half,
    y: half - y * half,
    visible: z < 0.12,
  };
}

export default function Globe3D({
  sellers,
  onSellerClick,
  onCountryClick,
  selectedMarketplace,
  theme = "dark",
}: Globe3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(500);
  const [phi, setPhi] = useState(0.3);

  const sellersByCountry = useMemo(() => {
    const map = new Map<string, SellerPoint[]>();
    sellers.forEach((seller) => {
      const code = seller.country || "EU";
      map.set(code, [...(map.get(code) || []), seller]);
    });
    return Array.from(map.entries());
  }, [sellers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const nextSize = Math.min(container.clientWidth, container.clientHeight || 500);
    setSize(nextSize);

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: nextSize * 2,
      height: nextSize * 2,
      phi: 0.3,
      theta: 0.22,
      dark: theme === "dark" ? 1 : 0,
      diffuse: theme === "dark" ? 1.4 : 1.1,
      mapSamples: 18000,
      mapBrightness: theme === "dark" ? 2.2 : 5,
      baseColor: theme === "dark" ? [0.02, 0.09, 0.18] : [0.93, 0.96, 1],
      markerColor: [0.153, 0.392, 1],
      glowColor: theme === "dark" ? [0.03, 0.08, 0.18] : [0.86, 0.92, 1],
      markers: sellersByCountry
        .map(([code, points]) => {
          const coords = COUNTRY_COORDS[code];
          if (!coords) return null;
          return {
            location: coords,
            size: Math.max(0.05, Math.min(0.14, points.length * 0.015)),
          };
        })
        .filter(Boolean) as { location: [number, number]; size: number }[],
      scale: 0.95,
    });

    let frameId = 0;
    let localPhi = 0.3;
    const animate = () => {
      localPhi += 0.0018;
      setPhi(localPhi);
      globe.update({ phi: localPhi });
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    const handleResize = () => {
      const updated = Math.min(container.clientWidth, container.clientHeight || 500);
      setSize(updated);
      globe.update({ width: updated * 2, height: updated * 2 });
    };

    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(frameId);
      globe.destroy();
      window.removeEventListener("resize", handleResize);
    };
  }, [sellersByCountry, theme]);

  return (
    <div
      ref={containerRef}
      className="relative h-full min-h-[320px] rounded-[28px]"
      style={{
        background:
          theme === "dark"
            ? "radial-gradient(circle at top, #0A2345 0%, #03182F 60%)"
            : "radial-gradient(circle at top, #FFFFFF 0%, #F2F8FF 68%)",
      }}
    >
      <canvas ref={canvasRef} style={{ width: size, height: size }} className="mx-auto" />

      {sellersByCountry.map(([code, points]) => {
        const coords = COUNTRY_COORDS[code];
        if (!coords) return null;
        const projected = projectToScreen(coords[0], coords[1], phi, 0.22, size);
        if (!projected.visible) return null;
        const averageScore =
          points.reduce((total, point) => total + point.score, 0) / points.length;
        const highlighted = selectedMarketplace
          ? points.some(
              (point) =>
                point.marketplace.toLowerCase() === selectedMarketplace.toLowerCase()
            )
          : false;

        return (
          <button
            key={code}
            type="button"
            onClick={() =>
              points.length === 1 ? onSellerClick?.(points[0].id) : onCountryClick?.(code)
            }
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: projected.x, top: projected.y }}
          >
            <span
              className="flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[10px] font-bold"
              style={{
                background: highlighted ? "#03182F" : "#FFFFFF",
                color: highlighted ? "#FFFFFF" : averageScore >= 72 ? "#2764FF" : "#8C3E00",
                border: `1px solid ${highlighted ? "#03182F" : "#D6DEE8"}`,
                boxShadow: "0 8px 20px rgba(39,100,255,0.12)",
              }}
            >
              {points.length}
            </span>
          </button>
        );
      })}
    </div>
  );
}
