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
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StepsData {
  date: string;
  steps: number;
}

interface StepsChartProps {
  data: StepsData[];
  goal?: number;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
        <p className="text-slate-400 text-xs mb-1">
          {label
            ? format(parseISO(label), "dd 'de' MMM", { locale: ptBR })
            : ""}
        </p>
        <p className="text-white font-semibold">
          {payload[0].value.toLocaleString("pt-BR")} passos
        </p>
      </div>
    );
  }
  return null;
};

export default function StepsChart({ data, goal = 10000 }: StepsChartProps) {
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
          tickFormatter={(val) =>
            val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val
          }
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#1e293b" }} />
        <ReferenceLine
          y={goal}
          stroke="#3b82f6"
          strokeDasharray="4 4"
          strokeOpacity={0.5}
        />
        <Bar
          dataKey="steps"
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
