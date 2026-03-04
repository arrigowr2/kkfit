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
  targetDate?: string;
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
  const [pendingDates, setPendingDates] = useState<string[]>([]);

  // Quick date options
  const quickDates = [
    { label: "Total", value: "total", mode: "total" as const },
    { label: "Hoje", value: "today", mode: "today" as const },
    { label: "Ontem", value: "yesterday", mode: "yesterday" as const },
  ];

  const fetchData = (date: string, mode: string) => {
    setLoading(true);
    // If mode is 'total', send 'total' as param; if mode is 'today', send 'today'; otherwise send the date
    let url: string;
    if (mode === "total") {
      url = "/api/fitness/summary?date=total";
    } else if (mode === "today") {
      url = "/api/fitness/summary?date=today";
    } else if (mode === "yesterday") {
      url = "/api/fitness/summary?date=yesterday";
    } else if (mode === "multiple" && date) {
      url = `/api/fitness/summary?date=${date}&mode=multiple`;
    } else {
      url = date ? `/api/fitness/summary?date=${date}` : "/api/fitness/summary?date=total";
    }
    console.log("[ActivityPageClient] Fetching:", url);
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        console.log("[ActivityPageClient] Received data:", {
          targetDate: d?.targetDate,
          today: d?.today,
          stepsCount: d?.steps?.length,
          stepsDates: d?.steps?.map((s: {date: string}) => s.date)
        });
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        console.error("[ActivityPageClient] Fetch error:", e);
        setLoading(false);
      });
  };

  // Initial data fetch - default to total mode
  useEffect(() => {
    fetch("/api/fitness/summary?date=total")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleQuickDate = (value: string, mode: "today" | "yesterday" | "custom" | "total") => {
    console.log("[ActivityPageClient] handleQuickDate called:", { value, mode });
    setSelectedMode(mode);
    if (mode === "total") {
      setSelectedDate("");
      fetchData("", "total");
    } else if (mode === "today") {
      setSelectedDate("");
      console.log("[ActivityPageClient] Fetching TODAY data");
      fetchData("", "today");
    } else if (mode === "yesterday") {
      setSelectedDate(value);
      setShowDatePicker(false);
      console.log("[ActivityPageClient] Fetching YESTERDAY data, value:", value);
      fetchData(value, "yesterday");
    } else if (mode === "custom") {
      setShowDatePicker(true);
    }
  };

  // Prevent dropdown from closing when clicking inside
  const datePickerRef = React.useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!showDatePicker) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        console.log("[ActivityPageClient] Click outside detected, closing picker");
        setShowDatePicker(false);
      }
    };
    
    // Delay to avoid immediate close on the button click that opens it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDatePicker]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("[ActivityPageClient] handleDateChange FIRED!");
    console.log("[ActivityPageClient] Event target:", e.target);
    console.log("[ActivityPageClient] Event target value:", e.target.value);
    const dateValue = e.target.value;
    console.log("[ActivityPageClient] Date picker changed:", dateValue);
    if (dateValue) {
      // HTML date input already returns YYYY-MM-DD format in local time
      const dateStr = dateValue;
      console.log("[ActivityPageClient] Processing date:", dateStr);
      // Add to pending dates (toggle)
      setPendingDates(prev => {
        console.log("[ActivityPageClient] Current pending dates:", prev);
        const newDates = prev.includes(dateStr)
          ? prev.filter(d => d !== dateStr)
          : [...prev, dateStr].sort();
        console.log("[ActivityPageClient] New pending dates:", newDates);
        return newDates;
      });
    } else {
      console.log("[ActivityPageClient] No date value received");
    }
  };

  const handleApplyDates = () => {
    console.log("[ActivityPageClient] handleApplyDates called, pendingDates:", pendingDates);
    if (pendingDates.length > 0) {
      setSelectedDate(pendingDates.join(","));
      setSelectedMode("custom");
      setShowDatePicker(false);
      // Fetch data for the selected dates
      const dateParam = pendingDates.join(",");
      console.log("[ActivityPageClient] Fetching multiple dates:", dateParam);
      fetch(`/api/fitness/summary?date=${dateParam}&mode=multiple`)
        .then((r) => r.json())
        .then((d) => {
          console.log("[ActivityPageClient] Received multiple dates data:", d);
          setData(d);
          setLoading(false);
        })
        .catch((e) => {
          console.error("[ActivityPageClient] Error fetching multiple dates:", e);
          setLoading(false);
        });
    } else {
      setShowDatePicker(false);
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
  
  // Helper to get local date string in YYYY-MM-DD format
  const getLocalDateStr = (date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // For total mode: use last 7 days. For custom/today/yesterday: use only the selected dates
  const stepsArr = data?.steps || [];
  const caloriesArr = data?.calories || [];
  const activityArr = data?.activity || [];
  
  let displaySteps: { date: string; steps: number }[];
  let displayCalories: { date: string; calories: number }[];
  let displayActivity: { date: string; activeMinutes: number; distance: number }[];
  
  // Get targetDate from API response for consistent filtering (server time)
  const apiTargetDate = data?.targetDate;
  
  console.log("[ActivityPageClient] Display mode:", selectedMode, "apiTargetDate:", apiTargetDate);
  console.log("[ActivityPageClient] stepsArr dates:", stepsArr.map(d => d.date));
  
  if (selectedMode === "total") {
    displaySteps = stepsArr.slice(-7);
    displayCalories = caloriesArr.slice(-7);
    displayActivity = activityArr.slice(-7);
  } else if (selectedMode === "today" || selectedMode === "yesterday") {
    // For today/yesterday: use the today object from API response
    // The API returns single-day data in the "today" object, not in arrays
    console.log("[ActivityPageClient] Using today object for", selectedMode, ":", data?.today);
    if (data?.today) {
      // Create a single entry using the targetDate and today object values
      displaySteps = [{ date: apiTargetDate || "", steps: data.today.steps || 0 }];
      displayCalories = [{ date: apiTargetDate || "", calories: data.today.calories || 0 }];
      displayActivity = [{
        date: apiTargetDate || "",
        activeMinutes: data.today.activeMinutes || 0,
        distance: data.today.distance || 0
      }];
    } else {
      displaySteps = [];
      displayCalories = [];
      displayActivity = [];
    }
    console.log("[ActivityPageClient] Single day data - steps:", displaySteps);
  } else {
    // For custom - show all data for the selected dates (API returns filtered data)
    displaySteps = stepsArr;
    displayCalories = caloriesArr;
    displayActivity = activityArr;
  }
  
  const totalSteps = displaySteps.reduce((a, b) => a + b.steps, 0);
  const totalCalories = displayCalories.reduce((a, b) => a + b.calories, 0);
  const totalDistance = displayActivity.reduce((a, b) => a + b.distance, 0);
  const totalActiveMinutes = displayActivity.reduce((a, b) => a + b.activeMinutes, 0);
  const daysWithGoal = displaySteps.filter((d) => d.steps >= 10000).length;

  // For charts: use same logic as totals
  const chartSteps = selectedMode === "total" ? displaySteps.slice(-7) : displaySteps;
  const chartCalories = selectedMode === "total" ? displayCalories.slice(-7) : displayCalories;
  const chartActivity = selectedMode === "total" ? displayActivity.slice(-7) : displayActivity;

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
              onClick={() => {
                const newState = !showDatePicker;
                console.log("[ActivityPageClient] Toggling date picker:", newState);
                setShowDatePicker(newState);
              }}
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
              <div
                ref={datePickerRef}
                className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-xl z-50 min-w-[280px]"
              >
                <input
                  type="date"
                  onChange={handleDateChange}
                  className="bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-blue-500 focus:outline-none w-full"
                  max={getLocalDateStr()}
                  className="bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-blue-500 focus:outline-none w-full"
                />
                
                {/* Selected dates display */}
                {pendingDates.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs text-slate-400">Datas selecionadas:</p>
                    <div className="flex flex-wrap gap-1">
                      {pendingDates.map(date => (
                        <span key={date} className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded">
                          {new Date(date + "T00:00:00").toLocaleDateString("pt-BR")}
                          <button
                            onClick={() => setPendingDates(prev => prev.filter(d => d !== date))}
                            className="hover:text-white"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-slate-500 mt-2">Clique em uma data para selecionar múltiplas</p>
                
                {pendingDates.length > 0 && (
                  <button
                    onClick={handleApplyDates}
                    disabled={loading}
                    className="mt-3 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                  >
                    {loading ? "Carregando..." : `Ver ${pendingDates.length} dia(s)`}
                  </button>
                )}
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
          <StepsChart data={chartSteps} />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-1">Calorias Queimadas</h3>
          <p className="text-slate-400 text-xs mb-4">Últimos 7 dias</p>
          <CaloriesChart data={chartCalories} />
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
              data={chartActivity}
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
