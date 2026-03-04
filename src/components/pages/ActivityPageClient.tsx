"use client";

import React, { useEffect, useState } from "react";
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
  today: {
    steps: number;
    calories: number;
    activeMinutes: number;
    distance: number;
  } | null;
  steps: { date: string; steps: number }[];
  calories: { date: string; calories: number }[];
  activity: { date: string; activeMinutes: number; distance: number }[];
}

export default function ActivityPageClient() {
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedMode, setSelectedMode] = useState<"today" | "yesterday" | "custom" | "total">("total");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Quick date options
  const quickDates = [
    { label: "Total", value: "", mode: "total" as const },
    { label: "Hoje", value: "", mode: "today" as const },
    { label: "Ontem", value: "yesterday", mode: "yesterday" as const },
  ];

  const fetchData = (date: string) => {
    setLoading(true);
    // If total mode, fetch all data (no date filter)
    const url = selectedMode === "total" ? "/api/fitness/summary" : (date ? `/api/fitness/summary?date=${date}` : "/api/fitness/summary");
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetch("/api/fitness/summary")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleQuickDate = (value: string, mode: "today" | "yesterday" | "custom" | "total") => {
    setSelectedMode(mode);
    if (mode === "total") {
      setSelectedDate("");
      fetchData("");
    } else {
      setSelectedDate(value);
      setShowDatePicker(false);
      fetchData(value);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      const date = new Date(dateValue);
      const dateStr = date.toISOString().split("T")[0];
      setSelectedDate(dateStr);
      setSelectedMode("custom");
      setShowDatePicker(false);
      fetchData(dateStr);
    } else {
      setSelectedDate("");
      setShowDatePicker(false);
      fetchData("");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const today = data?.today;
  
  // Calculate weekly data (last 7 days)
  const weeklySteps = (data?.steps || []).slice(-7);
  const weeklyCalories = (data?.calories || []).slice(-7);
  const weeklyActivity = (data?.activity || []).slice(-7);
  
  const totalSteps = weeklySteps.reduce((a, b) => a + b.steps, 0);
  const totalCalories = weeklyCalories.reduce((a, b) => a + b.calories, 0);
  const totalDistance = weeklyActivity.reduce((a, b) => a + b.distance, 0);
  const totalActiveMinutes = weeklyActivity.reduce((a, b) => a + b.activeMinutes, 0);
  const daysWithGoal = weeklySteps.filter((d) => d.steps >= 10000).length;

  const last7Activity = (data?.activity || []).slice(-7);

  return (
    <div className="space-y-6">
      {/* Header with Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Atividade Física</h1>
        </div>
        
        {/* Date Selector */}
        <div className="flex items-center gap-2">
          {quickDates.map((q) => (
            <button
              key={q.mode}
              onClick={() => handleQuickDate(q.value, q.mode)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedMode === q.mode
                  ? "bg-blue-500 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {q.label}
            </button>
          ))}
          
          {/* Custom date picker */}
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                selectedMode === "custom"
                  ? "bg-blue-500 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {selectedMode === "custom" && selectedDate 
                ? new Date(selectedDate + "T00:00:00").toLocaleDateString("pt-BR")
                : "Personalizado"}
            </button>
            
            {showDatePicker && (
              <div className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-xl z-10">
                <input
                  type="date"
                  onChange={handleDateChange}
                  max={new Date().toISOString().split("T")[0]}
                  className="bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500 mt-2">Selecione uma data específica</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary cards - hide Dias com Meta when single day selected */}
      <div className={`grid gap-4 ${selectedMode === "total" ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 lg:grid-cols-3"}`}>
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
        {/* Dias com Meta - only show in total mode */}
        {selectedMode === "total" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-start justify-between mb-2">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">
                Dias com Meta
              </p>
              <span className="text-xl">🎯</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-green-400">
                {daysWithGoal}/7
              </span>
              <span className="text-slate-400 text-sm">dias</span>
            </div>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-1">Passos Diários</h3>
          <p className="text-slate-400 text-xs mb-4">
            Últimos 7 dias
          </p>
          <StepsChart data={weeklySteps} />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-1">Calorias Queimadas</h3>
          <p className="text-slate-400 text-xs mb-4">Últimos 7 dias</p>
          <CaloriesChart data={weeklyCalories} />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 lg:col-span-2">
          <h3 className="text-white font-semibold mb-1">
            Minutos de Atividade
          </h3>
          <p className="text-slate-400 text-xs mb-4">
            Semanal (7 dias)
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={last7Activity}
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
