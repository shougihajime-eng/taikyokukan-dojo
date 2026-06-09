"use client";
// 精度ポイントの時系列折れ線（けいこごと）
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";

export interface TrendPoint {
  at: string; // ISO日時
  score: number | null;
  bias: number | null;
}

export default function TrendChart({ data }: { data: TrendPoint[] }) {
  const rows = data
    .filter((d) => typeof d.score === "number")
    .map((d, i) => ({
      i: i + 1,
      score: Math.round(d.score!),
      biasPt: d.bias === null ? null : Math.round(d.bias * 100),
      day: new Date(d.at).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }),
    }));
  if (rows.length === 0) return null;
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#c9b894" }} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#c9b894" }} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(value, name) =>
              name === "score" ? [`${value ?? "—"}点`, "精度"] : [value ?? "—", name]
            }
            labelFormatter={(label) => `${label} のけいこ`}
            contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #b48b48", background: "#0e1430", color: "#f3ecda" }}
            labelStyle={{ color: "#e7c987" }}
            cursor={{ stroke: "#b48b48", strokeOpacity: 0.4 }}
          />
          <ReferenceLine y={50} stroke="#b48b48" strokeDasharray="4 4" strokeOpacity={0.5} />
          <Line type="monotone" dataKey="score" stroke="#ff7d57" strokeWidth={2.5} dot={{ r: 3.5, fill: "#ff7d57" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
