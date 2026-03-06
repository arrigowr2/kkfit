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
  console.log("[HeartRateChart] Received data:", data);
  
  if (!data || data.length === 0) {
    console.log("[HeartRateChart] No data to display");
    return <div className="text-slate-400 text-center py-8">Sem dados para exibir</div>;
  }

  console.log("[HeartRateChart] Processing data, length:", data.length);
  const last14 = data.slice(-14);
  console.log("[HeartRateChart] Processed data:", last14);

  // Debug: check if data has valid values
  const hasValidData = last14.some(d => d.avg > 0);
  console.log("[HeartRateChart] Has valid data:", hasValidData);

  // Check if min/max are different from avg (i.e., we have multiple readings per day)
  const hasDetailedData = last14.some(d => d.min !== d.max || d.max !== d.avg);
  console.log("[HeartRateChart] Has detailed data (min != max):", hasDetailedData);

  return (
    <div className="w-full" style={{ minHeight: '200px' }}>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={last14} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="heartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
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
            strokeWidth={3}
            fill="url(#heartGradient)"
            dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
          />
          {/* Only show min/max lines if we have detailed data (multiple readings per day) */}
          {hasDetailedData && (
            <>
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
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
