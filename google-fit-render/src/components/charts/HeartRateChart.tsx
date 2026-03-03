"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HeartRateData {
  date: string;
  avg: number;
  min: number;
  max: number;
}

interface HeartRateChartProps {
  data: HeartRateData[];
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
        <p className="text-slate-400 text-xs mb-2">
          {label
            ? format(parseISO(label), "dd 'de' MMM", { locale: ptBR })
            : ""}
        </p>
        {payload.map((entry) => (
          <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
            {entry.name === "avg"
              ? "Média"
              : entry.name === "max"
                ? "Máx"
                : "Mín"}
            : {entry.value} bpm
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function HeartRateChart({ data }: HeartRateChartProps) {
  const last14 = data.slice(-14);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={last14} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <defs>
          <linearGradient id="heartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="date"
          tickFormatter={(val) =>
            format(parseISO(val), "dd/MM", { locale: ptBR })
          }
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="avg"
          stroke="#ef4444"
          strokeWidth={2}
          fill="url(#heartGradient)"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="max"
          stroke="#f97316"
          strokeWidth={1}
          strokeDasharray="4 4"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="min"
          stroke="#22c55e"
          strokeWidth={1}
          strokeDasharray="4 4"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
