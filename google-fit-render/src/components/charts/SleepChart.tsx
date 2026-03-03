"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SleepData {
  date: string;
  duration: number;
  quality: string;
}

interface SleepChartProps {
  data: SleepData[];
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; payload: SleepData }[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    const hours = Math.floor(payload[0].value / 60);
    const minutes = payload[0].value % 60;
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
        <p className="text-slate-400 text-xs mb-1">
          {label
            ? format(parseISO(label), "dd 'de' MMM", { locale: ptBR })
            : ""}
        </p>
        <p className="text-purple-400 font-semibold">
          {hours}h {minutes}min
        </p>
        <p className="text-xs text-slate-400 mt-1">
          {payload[0].payload.quality}
        </p>
      </div>
    );
  }
  return null;
};

const qualityColor = (quality: string) => {
  switch (quality) {
    case "Boa":
      return "#a855f7";
    case "Regular":
      return "#f59e0b";
    default:
      return "#ef4444";
  }
};

export default function SleepChart({ data }: SleepChartProps) {
  const last14 = data.slice(-14);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={last14} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
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
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(val) => `${Math.floor(val / 60)}h`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#1e293b" }} />
        <ReferenceLine
          y={420}
          stroke="#a855f7"
          strokeDasharray="4 4"
          strokeOpacity={0.5}
        />
        <Bar dataKey="duration" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {last14.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={qualityColor(entry.quality)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
