"use client";

import { useEffect, useState } from "react";
import WeightChart from "@/components/charts/WeightChart";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WeightData {
  date: string;
  weight: number;
}

export default function WeightPageClient() {
  const [data, setData] = useState<WeightData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/fitness/summary")
      .then((r) => r.json())
      .then((d) => {
        setData(d.weight || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  const currentWeight = data.length > 0 ? data[data.length - 1].weight : null;
  const firstWeight = data.length > 0 ? data[0].weight : null;
  const weightChange =
    currentWeight && firstWeight ? currentWeight - firstWeight : null;
  const minWeight = data.length > 0 ? Math.min(...data.map((d) => d.weight)) : 0;
  const maxWeight = data.length > 0 ? Math.max(...data.map((d) => d.weight)) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Histórico de Peso</h1>
        <p className="text-slate-400 text-sm mt-1">
          Evolução dos últimos 90 dias
        </p>
      </div>

      {data.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
          <p className="text-4xl mb-3">⚖️</p>
          <p className="text-slate-400">Nenhum dado de peso encontrado.</p>
          <p className="text-slate-500 text-sm mt-1">
            Registre seu peso no Google Fit ou em um dispositivo compatível.
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          </div>

          {/* Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-1">
              Evolução do Peso
            </h3>
            <p className="text-slate-400 text-xs mb-4">
              Últimos 90 dias
            </p>
            <WeightChart data={data} />
          </div>

          {/* BMI calculator */}
          {currentWeight && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">
                Calculadora de IMC
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Insira sua altura para calcular seu Índice de Massa Corporal
                (IMC) com base no peso atual de{" "}
                <span className="text-emerald-400 font-medium">
                  {currentWeight.toFixed(1)} kg
                </span>
                .
              </p>
              <BMICalculator weight={currentWeight} />
            </div>
          )}

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
                  {[...data].reverse().slice(0, 20).map((day, idx, arr) => {
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

function BMICalculator({ weight }: { weight: number }) {
  const [height, setHeight] = useState("");
  const [bmi, setBmi] = useState<number | null>(null);

  const calculate = () => {
    const h = parseFloat(height) / 100;
    if (h > 0) {
      setBmi(weight / (h * h));
    }
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: "Abaixo do peso", color: "text-blue-400" };
    if (bmi < 25) return { label: "Peso normal", color: "text-green-400" };
    if (bmi < 30) return { label: "Sobrepeso", color: "text-yellow-400" };
    return { label: "Obesidade", color: "text-red-400" };
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start">
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Altura (cm)"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm w-36 focus:outline-none focus:border-emerald-500"
        />
        <button
          onClick={calculate}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
        >
          Calcular
        </button>
      </div>
      {bmi !== null && (
        <div className="flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-2">
          <div>
            <p className="text-slate-400 text-xs">IMC</p>
            <p className={`text-xl font-bold ${getBMICategory(bmi).color}`}>
              {bmi.toFixed(1)}
            </p>
          </div>
          <div className="w-px h-8 bg-slate-700" />
          <div>
            <p className="text-slate-400 text-xs">Classificação</p>
            <p className={`text-sm font-medium ${getBMICategory(bmi).color}`}>
              {getBMICategory(bmi).label}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
