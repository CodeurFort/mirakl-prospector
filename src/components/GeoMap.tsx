"use client";

import { useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Country code → approximate coordinates
const COUNTRY_COORDS: Record<string, [number, number]> = {
  FR: [2.3, 46.6],
  DE: [10.4, 51.2],
  UK: [-1.2, 52.5],
  US: [-98, 39],
  IT: [12.5, 42.5],
  ES: [-3.7, 40.4],
  NL: [5.3, 52.1],
  BE: [4.4, 50.8],
  SE: [18.0, 62.0],
  DK: [9.5, 56.3],
  AT: [14.6, 47.7],
  PL: [19.1, 51.9],
  EU: [10, 50],
  CH: [8.2, 46.8],
};

// Marketplace locations for markers
const MARKETPLACE_LOCATIONS: {
  name: string;
  coords: [number, number];
  color: string;
}[] = [
  { name: "Zalando", coords: [13.4, 52.5], color: "#2764FF" },
  { name: "La Redoute", coords: [3.06, 50.63], color: "#2764FF" },
  { name: "Galeries Lafayette", coords: [2.34, 48.87], color: "#2764FF" },
  { name: "John Lewis", coords: [-0.14, 51.51], color: "#2764FF" },
  { name: "Debenhams", coords: [-0.15, 51.52], color: "#2764FF" },
  { name: "Bloomingdales", coords: [-73.97, 40.76], color: "#F22E75" },
  { name: "Nordstrom", coords: [-122.33, 47.61], color: "#F22E75" },
];

interface SellerGeo {
  country: string;
  count: number;
  avgScore: number;
}

export default function GeoMap({
  sellers,
}: {
  sellers: { country?: { code: string } | null; match_score: number | null }[];
}) {
  const geoData = useMemo(() => {
    const map = new Map<string, { count: number; totalScore: number }>();
    for (const s of sellers) {
      const code = s.country?.code || "EU";
      const existing = map.get(code) || { count: 0, totalScore: 0 };
      existing.count++;
      existing.totalScore += s.match_score || 0;
      map.set(code, existing);
    }
    const result: SellerGeo[] = [];
    map.forEach((v, k) => {
      result.push({
        country: k,
        count: v.count,
        avgScore: Math.round(v.totalScore / v.count),
      });
    });
    return result;
  }, [sellers]);

  return (
    <div className="mirakl-card-elevated p-6">
      <h3
        className="font-bold mb-4"
        style={{ fontSize: 16, lineHeight: "26px", color: "#03182F" }}
      >
        Couverture géographique
      </h3>
      <div className="relative">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ center: [10, 50], scale: 600 }}
          width={800}
          height={420}
          style={{ width: "100%", height: "auto" }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies
                .filter(
                  (geo) =>
                    // Europe + US focus
                    geo.properties.CONTINENT === "Europe" ||
                    geo.properties.NAME === "United States of America" ||
                    geo.properties.NAME === "Canada"
                )
                .map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#E2E8F0"
                    stroke="#CBD5E1"
                    strokeWidth={0.5}
                    style={{
                      hover: { fill: "#CBD5E1" },
                    }}
                  />
                ))
            }
          </Geographies>

          {/* Seller country bubbles */}
          {geoData.map((g) => {
            const coords = COUNTRY_COORDS[g.country];
            if (!coords) return null;
            const size = Math.max(6, Math.min(20, g.count * 1.5));
            return (
              <Marker key={g.country} coordinates={coords}>
                <circle
                  r={size}
                  fill="#2764FF"
                  fillOpacity={0.25}
                  stroke="#2764FF"
                  strokeWidth={1.5}
                />
                <circle r={3} fill="#2764FF" />
                <text
                  textAnchor="middle"
                  y={-size - 4}
                  style={{
                    fontFamily: "Roboto Serif",
                    fontSize: 10,
                    fontWeight: 700,
                    fill: "#03182F",
                  }}
                >
                  {g.country} ({g.count})
                </text>
              </Marker>
            );
          })}

          {/* Marketplace markers */}
          {MARKETPLACE_LOCATIONS.map((mp) => (
            <Marker key={mp.name} coordinates={mp.coords}>
              <polygon
                points="0,-8 5,0 -5,0"
                fill={mp.color}
                stroke="#fff"
                strokeWidth={1}
              />
              <text
                textAnchor="middle"
                y={10}
                style={{
                  fontFamily: "Roboto Serif",
                  fontSize: 8,
                  fontWeight: 700,
                  fill: mp.color,
                }}
              >
                {mp.name}
              </text>
            </Marker>
          ))}
        </ComposableMap>

        {/* Legend */}
        <div className="absolute bottom-2 right-2 bg-white/90 rounded-lg p-3 text-[11px] space-y-1.5">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ background: "#2764FF", opacity: 0.4 }}
            />
            <span style={{ color: "#30373E" }}>Sellers par pays</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-0 h-0"
              style={{
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderBottom: "8px solid #2764FF",
              }}
            />
            <span style={{ color: "#30373E" }}>Marketplaces EU</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-0 h-0"
              style={{
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderBottom: "8px solid #F22E75",
              }}
            />
            <span style={{ color: "#30373E" }}>Marketplaces US</span>
          </div>
        </div>
      </div>
    </div>
  );
}
