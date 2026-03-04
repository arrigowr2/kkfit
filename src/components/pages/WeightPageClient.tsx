"use client";

import { useEffect, useState } from "react";
import WeightChart from "@/components/charts/WeightChart";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface WeightData {
  date: string;
  weight: number;
}

interface WeeklyWeight {
  week: string;
  avgWeight: number;
  weights: WeightData[];
}

export default function WeightPageClient() {
  const [data, setData] = useState<WeightData[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualWeights, setManualWeights] = useState<WeightData[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [userHeight, setUserHeight] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/fitness/summary")
      .then((r) => r.json())
      .then((d) => {
        setData(d.weight || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Load manual weights from localStorage
    const savedManualWeights = localStorage.getItem("kkfit_manual_weights");
    if (savedManualWeights) {
      setManualWeights(JSON.parse(savedManualWeights));
    }
    
    // Load user height from profile
    const savedProfile = localStorage.getItem("kkfit_profile");
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      if (profile.height) {
        setUserHeight(profile.height);
      }
    }
  }, []);

  const addManualWeight = () => {
    if (!newWeight || !newDate) return;
    
    const newEntry: WeightData = {
      date: newDate,
      weight: parseFloat(newWeight)
    };
    
    const updatedWeights = [...manualWeights, newEntry].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    setManualWeights(updatedWeights);
    localStorage.setItem("kkfit_manual_weights", JSON.stringify(updatedWeights));
    setNewWeight("");
    setShowAddForm(false);
  };

  const deleteManualWeight = (date: string) => {
    const updatedWeights = manualWeights.filter(w => w.date !== date);
    setManualWeights(updatedWeights);
    localStorage.setItem("kkfit_manual_weights", JSON.stringify(updatedWeights));
  };

  // Combine Google Fit data with manual weights
  const combinedData = [...data, ...manualWeights].reduce((acc: WeightData[], item) => {
    const existing = acc.find(w => w.date === item.date);
    if (!existing) {
      acc.push(item);
    }
    return acc;
  }, []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Group data by week for weekly chart
  const getWeeklyData = (): WeeklyWeight[] => {
    if (combinedData.length === 0) return [];
    
    const weeks: { [key: string]: WeightData[] } = {};
    
    combinedData.forEach(item => {
      const date = new Date(item.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split("T")[0];
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = [];
      }
      weeks[weekKey].push(item);
    });
    
    return Object.entries(weeks).map(([week, weights]) => ({
      week,
      avgWeight: weights.reduce((sum, w) => sum + w.weight, 0) / weights.length,
      weights
    })).slice(-12); // Last 12 weeks
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const currentWeight = combinedData.length > 0 ? combinedData[combinedData.length - 1].weight : null;
  const firstWeight = combinedData.length > 0 ? combinedData[0].weight : null;
  const weightChange =
    currentWeight && firstWeight ? currentWeight - firstWeight : null;
  const minWeight = combinedData.length > 0 ? Math.min(...combinedData.map((d) => d.weight)) : 0;
  const maxWeight = combinedData.length > 0 ? Math.max(...combinedData.map((d) => d.weight)) : 0;

  // Calculate BMI using userHeight from profile (default 170cm)
  const heightInM = (userHeight || 170) / 100;
  const bmi = currentWeight && heightInM > 0 ? currentWeight / (heightInM * heightInM) : null;

  const getBMICategory = (bmiValue: number) => {
    if (bmiValue < 18.5) return { label: "Abaixo do peso", color: "text-blue-400", bg: "bg-blue-500/20" };
    if (bmiValue < 25) return { label: "Peso normal", color: "text-green-400", bg: "bg-green-500/20" };
    if (bmiValue < 30) return { label: "Sobrepeso", color: "text-yellow-400", bg: "bg-yellow-500/20" };
    return { label: "Obesidade", color: "text-red-400", bg: "bg-red-500/20" };
  };

  const bmiCategory = bmi ? getBMICategory(bmi) : null;

  const weeklyData = getWeeklyData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Histórico de Peso</h1>
        <p className="text-slate-400 text-sm mt-1">
          Evolução dos últimos 90 dias
        </p>
      </div>

      {combinedData.length === 0 && manualWeights.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
          <p className="text-4xl mb-3">⚖️</p>
          <p className="text-slate-400">Nenhum dado de peso encontrado.</p>
          <p className="text-slate-500 text-sm mt-1">
            Registre seu peso no Google Fit, adicione manualmente abaixo, ou use um dispositivo compatível.
          </p>
        </div>
      ) : (
        <>
          {/* Add Manual Weight Button */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <span>+</span> Adicionar Peso
            </button>
          </div>

          {/* Add Manual Weight Form */}
          {showAddForm && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">Registrar Peso Manual</h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wide">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    placeholder="70.0"
                    className="w-full sm:w-32 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white mt-1 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wide">Data</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full sm:w-40 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white mt-1 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={addManualWeight}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">
                Peso Atual
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-emerald-400">
                  {currentWeight?.toFixed(1)}
                </span>
                <span className="text-slate-400">kg</span>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">
                Variação (90 dias)
              </p>
              <div className="flex items-baseline gap-1">
                <span
                  className={`text-3xl font-bold ${
                    weightChange === null
                      ? "text-slate-400"
                      : weightChange < 0
                        ? "text-green-400"
                        : weightChange > 0
                          ? "text-red-400"
                          : "text-slate-400"
                  }`}
                >
                  {weightChange !== null
                    ? `${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)}`
                    : "—"}
                </span>
                <span className="text-slate-400">kg</span>
              </div>
              {weightChange !== null && (
                <p className="text-xs text-slate-500 mt-1">
                  {weightChange < 0
                    ? "Perda de peso 🎉"
                    : weightChange > 0
                      ? "Ganho de peso"
                      : "Peso estável"}
                </p>
              )}
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">
                Mínimo
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-blue-400">
                  {minWeight.toFixed(1)}
                </span>
                <span className="text-slate-400">kg</span>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">
                Máximo
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-orange-400">
                  {maxWeight.toFixed(1)}
                </span>
                <span className="text-slate-400">kg</span>
              </div>
            </div>
            {/* IMC Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">
                IMC
              </p>
              {bmi && bmiCategory ? (
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-bold ${bmiCategory.color}`}>
                      {bmi.toFixed(1)}
                    </span>
                  </div>
                  <p className={`text-xs ${bmiCategory.color} mt-1`}>
                    {bmiCategory.label}
                  </p>
                </div>
              ) : (
                <div>
                  <span className="text-2xl text-slate-500">—</span>
                  <p className="text-xs text-slate-500 mt-1">
                    Adicione altura no Perfil
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Weekly Chart */}
          {weeklyData.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-1">
                Evolução Semanal
              </h3>
              <p className="text-slate-400 text-xs mb-4">
                Média por semana
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={weeklyData}
                  margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="week"
                    tickFormatter={(val) =>
                      format(parseISO(val), "dd/MM", { locale: ptBR })
                    }
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={['dataMin - 1', 'dataMax + 1']}
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
                    formatter={(val) => [`${Number(val).toFixed(1)} kg`, "Média"]}
                    labelFormatter={(label) =>
                      format(parseISO(String(label)), "dd 'de' MMM", { locale: ptBR })
                    }
                  />
                  <Bar
                    dataKey="avgWeight"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-1">
              Evolução do Peso
            </h3>
            <p className="text-slate-400 text-xs mb-4">
              Últimos 90 dias
            </p>
            <WeightChart data={combinedData} />
          </div>

          {/* History table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4">
              Registros de Peso
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs uppercase tracking-wide border-b border-slate-800">
                    <th className="text-left pb-3">Data</th>
                    <th className="text-right pb-3">Peso</th>
                    <th className="text-right pb-3">Variação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {[...combinedData].reverse().slice(0, 20).map((day, idx, arr) => {
                    const prev = arr[idx + 1];
                    const diff = prev ? day.weight - prev.weight : null;
                    return (
                      <tr key={day.date} className="text-slate-300">
                        <td className="py-3">
                          {format(parseISO(day.date), "dd 'de' MMM, yyyy", {
                            locale: ptBR,
                          })}
                        </td>
                        <td className="text-right font-medium text-emerald-400">
                          {day.weight.toFixed(1)} kg
                        </td>
                        <td className="text-right">
                          {diff !== null ? (
                            <span
                              className={`text-xs ${
                                diff < 0
                                  ? "text-green-400"
                                  : diff > 0
                                    ? "text-red-400"
                                    : "text-slate-400"
                              }`}
                            >
                              {diff > 0 ? "+" : ""}
                              {diff.toFixed(1)} kg
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
