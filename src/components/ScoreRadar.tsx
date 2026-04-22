"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

interface ScoreRadarProps {
  scores: { name: string; score: number }[];
  size?: number;
}

export default function ScoreRadar({ scores, size = 280 }: ScoreRadarProps) {
  const data = scores.map((s) => ({
    marketplace: s.name,
    score: s.score,
    fullMark: 100,
  }));

  return (
    <div style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#E2E8F0" />
          <PolarAngleAxis
            dataKey="marketplace"
            tick={{ fill: "#03182F", fontSize: 12 }}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#2764FF"
            fill="#2764FF"
            fillOpacity={0.3}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
