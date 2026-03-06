"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CaloriesData {
  date: string;
  calories: number;
}

interface CaloriesChartProps {
  data: CaloriesData[];
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
        <p className="text-orange-400 font-semibold">
          {Math.round(payload[0].value).toLocaleString("pt-BR")} kcal
        </p>
      </div>
    );
  }
  return null;
};

export default function CaloriesChart({ data }: CaloriesChartProps) {
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
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="calories"
          fill="#f97316"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
