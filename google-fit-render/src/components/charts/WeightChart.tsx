"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WeightData {
  date: string;
  weight: number;
}

interface WeightChartProps {
  data: WeightData[];
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
        <p className="text-emerald-400 font-semibold">
          {payload[0].value.toFixed(1)} kg
        </p>
      </div>
    );
  }
  return null;
};

export default function WeightChart({ data, goal }: WeightChartProps) {
  const last30 = data.slice(-30);
  const minWeight = Math.min(...last30.map((d) => d.weight)) - 2;
  const maxWeight = Math.max(...last30.map((d) => d.weight)) + 2;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={last30} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
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
          domain={[minWeight, maxWeight]}
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(val) => `${val}kg`}
        />
        <Tooltip content={<CustomTooltip />} />
        {goal && (
          <ReferenceLine
            y={goal}
            stroke="#22c55e"
            strokeDasharray="4 4"
            strokeOpacity={0.7}
            label={{ value: "Meta", fill: "#22c55e", fontSize: 11 }}
          />
        )}
        <Line
          type="monotone"
          dataKey="weight"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ fill: "#10b981", r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
