"use client";

import { useEffect, useState } from "react";
import StepsChart from "@/components/charts/StepsChart";
import CaloriesChart from "@/components/charts/CaloriesChart";
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

interface ActivityData {
  steps: { date: string; steps: number }[];
  calories: { date: string; calories: number }[];
  activity: { date: string; activeMinutes: number; distance: number }[];
}

export default function ActivityPageClient() {
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/fitness/summary")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const totalSteps = data?.steps.reduce((a, b) => a + b.steps, 0) || 0;
  const totalCalories =
    data?.calories.reduce((a, b) => a + b.calories, 0) || 0;
  const totalDistance =
    data?.activity.reduce((a, b) => a + b.distance, 0) || 0;
  const totalActiveMinutes =
    data?.activity.reduce((a, b) => a + b.activeMinutes, 0) || 0;
  const daysWithGoal = data?.steps.filter((d) => d.steps >= 10000).length || 0;

  const last14Activity = (data?.activity || []).slice(-14);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Atividade Física</h1>
        <p className="text-slate-400 text-sm mt-1">
          Análise detalhada dos últimos 30 dias
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total de Passos",
            value: totalSteps.toLocaleString("pt-BR"),
            unit: "passos",
            color: "text-blue-400",
            icon: "👟",
          },
          {
            label: "Calorias Totais",
            value: Math.round(totalCalories).toLocaleString("pt-BR"),
            unit: "kcal",
            color: "text-orange-400",
            icon: "🔥",
          },
          {
            label: "Distância Total",
            value: (totalDistance / 1000).toFixed(1),
            unit: "km",
            color: "text-cyan-400",
            icon: "📍",
          },
          {
            label: "Dias com Meta",
            value: `${daysWithGoal}/${data?.steps.length || 0}`,
            unit: "dias",
            color: "text-green-400",
            icon: "🎯",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
          >
            <div className="flex items-start justify-between mb-2">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">
                {card.label}
              </p>
              <span className="text-xl">{card.icon}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold ${card.color}`}>
                {card.value}
              </span>
              <span className="text-slate-400 text-sm">{card.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-1">Passos Diários</h3>
          <p className="text-slate-400 text-xs mb-4">
            Linha azul = meta de 10.000 passos
          </p>
          <StepsChart data={data?.steps || []} />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-1">Calorias Queimadas</h3>
          <p className="text-slate-400 text-xs mb-4">Últimos 14 dias</p>
          <CaloriesChart data={data?.calories || []} />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 lg:col-span-2">
          <h3 className="text-white font-semibold mb-1">
            Minutos de Atividade
          </h3>
          <p className="text-slate-400 text-xs mb-4">
            Meta: 30 minutos por dia
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={last14Activity}
              margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
            >
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
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#94a3b8" }}
                itemStyle={{ color: "#eab308" }}
                formatter={(val: number | undefined) => [`${val ?? 0} min`, "Minutos Ativos"]}
                labelFormatter={(label: unknown) =>
                  typeof label === "string" ? format(parseISO(label), "dd 'de' MMM", { locale: ptBR }) : String(label)
                }
              />
              <Bar
                dataKey="activeMinutes"
                fill="#eab308"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Steps breakdown table */}
      {data?.steps && data.steps.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">
            Histórico de Passos
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs uppercase tracking-wide border-b border-slate-800">
                  <th className="text-left pb-3">Data</th>
                  <th className="text-right pb-3">Passos</th>
                  <th className="text-right pb-3">Meta</th>
                  <th className="text-right pb-3">Progresso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {[...data.steps].reverse().slice(0, 14).map((day) => {
                  const progress = Math.min(
                    (day.steps / 10000) * 100,
                    100
                  );
                  return (
                    <tr key={day.date} className="text-slate-300">
                      <td className="py-3">
                        {format(parseISO(day.date), "dd 'de' MMM", {
                          locale: ptBR,
                        })}
                      </td>
                      <td className="text-right font-medium">
                        {day.steps.toLocaleString("pt-BR")}
                      </td>
                      <td className="text-right text-slate-500">10.000</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-slate-800 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                progress >= 100
                                  ? "bg-green-500"
                                  : progress >= 70
                                    ? "bg-blue-500"
                                    : "bg-slate-600"
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span
                            className={`text-xs ${
                              progress >= 100
                                ? "text-green-400"
                                : "text-slate-400"
                            }`}
                          >
                            {progress >= 100 ? "✓" : `${Math.round(progress)}%`}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
