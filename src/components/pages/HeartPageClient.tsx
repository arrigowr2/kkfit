"use client";

import { useEffect, useState } from "react";
import HeartRateChart from "@/components/charts/HeartRateChart";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HeartRateData {
  date: string;
  avg: number;
  min: number;
  max: number;
}

function getZone(bpm: number): { label: string; color: string; bg: string } {
  if (bpm < 60) return { label: "Abaixo do normal", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" };
  if (bpm <= 100) return { label: "Normal", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" };
  if (bpm <= 120) return { label: "Elevado", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" };
  return { label: "Alto", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" };
}

export default function HeartPageClient() {
  const [data, setData] = useState<HeartRateData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[HeartPage] Fetching heart rate data...");
    fetch("/api/fitness/summary?date=total")
      .then((r) => {
        console.log("[HeartPage] Response status:", r.status);
        return r.json();
      })
      .then((d) => {
        console.log("[HeartPage] Response data:", d);
        console.log("[HeartPage] Heart rate array:", d.heartRate);
        setData(d.heartRate || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[HeartPage] Error:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  const avgBpm =
    data.length > 0
      ? Math.round(data.reduce((a, b) => a + b.avg, 0) / data.length)
      : 0;
  
  // Calculate global min/max from ALL readings, not just one per day
  // This handles cases where each day has only 1 reading (min = max = avg per day)
  const allValues = data.flatMap(d => [d.min, d.max]);
  const globalMinBpm = allValues.length > 0 ? Math.min(...allValues) : 0;
  const globalMaxBpm = allValues.length > 0 ? Math.max(...allValues) : 0;
  
  const minBpm = globalMinBpm;
  const maxBpm = globalMaxBpm;
  const zone = getZone(avgBpm);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Frequência Cardíaca</h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1">
          Monitoramento dos últimos 30 dias
        </p>
      </div>

      {data.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-10 text-center">
          <p className="text-3xl sm:text-4xl mb-3">❤️</p>
          <p className="text-slate-400">
            Nenhum dado de frequência cardíaca encontrado.
          </p>
          <p className="text-slate-500 text-sm mt-1">
            Use um dispositivo compatível com Google Fit para registrar sua
            frequência cardíaca.
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-5">
              <p className="text-slate-400 text-[10px] sm:text-xs uppercase tracking-wide mb-1 sm:mb-2">
                Média
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-bold text-red-400">{avgBpm}</span>
                <span className="text-slate-400 text-sm sm:text-base">bpm</span>
              </div>
              <div className={`mt-2 sm:mt-3 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border text-xs font-medium inline-block ${zone.bg} ${zone.color}`}>
                {zone.label}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-5">
              <p className="text-slate-400 text-[10px] sm:text-xs uppercase tracking-wide mb-1 sm:mb-2">
                Mínima Registrada
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-bold text-green-400">{minBpm}</span>
                <span className="text-slate-400 text-sm sm:text-base">bpm</span>
              </div>
              <p className="text-slate-500 text-xs mt-2 sm:mt-3">
                Frequência em repouso
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-5">
              <p className="text-slate-400 text-[10px] sm:text-xs uppercase tracking-wide mb-1 sm:mb-2">
                Máxima Registrada
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-bold text-orange-400">{maxBpm}</span>
                <span className="text-slate-400 text-sm sm:text-base">bpm</span>
              </div>
              <p className="text-slate-500 text-xs mt-2 sm:mt-3">
                Frequência durante atividade
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-5">
            <h3 className="text-white font-semibold text-sm sm:text-base mb-1">
              Tendência de Frequência Cardíaca
            </h3>
            <p className="text-slate-400 text-xs mb-3 sm:mb-4">
              Vermelho = média · Laranja = máxima · Verde = mínima
            </p>
            <HeartRateChart data={data} />
          </div>

          {/* Zones reference */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-5">
            <h3 className="text-white font-semibold text-sm sm:text-base mb-3 sm:mb-4">
              Zonas de Frequência Cardíaca
            </h3>
            <div className="space-y-3">
              {[
                { zone: "Repouso", range: "< 60 bpm", color: "bg-blue-500", desc: "Atletas bem condicionados" },
                { zone: "Normal", range: "60–100 bpm", color: "bg-green-500", desc: "Faixa saudável em repouso" },
                { zone: "Elevado", range: "100–120 bpm", color: "bg-yellow-500", desc: "Atividade leve ou estresse" },
                { zone: "Alto", range: "> 120 bpm", color: "bg-red-500", desc: "Exercício intenso ou taquicardia" },
              ].map((z) => (
                <div key={z.zone} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${z.color} flex-shrink-0`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm font-medium">{z.zone}</span>
                      <span className="text-slate-400 text-xs">{z.range}</span>
                    </div>
                    <p className="text-slate-500 text-xs">{z.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* History table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-5">
            <h3 className="text-white font-semibold text-sm sm:text-base mb-3 sm:mb-4">Histórico</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs uppercase tracking-wide border-b border-slate-800">
                    <th className="text-left pb-3">Data</th>
                    <th className="text-right pb-3">Média</th>
                    <th className="text-right pb-3">Mín</th>
                    <th className="text-right pb-3">Máx</th>
                    <th className="text-right pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {[...data].reverse().slice(0, 14).map((day) => {
                    const z = getZone(day.avg);
                    return (
                      <tr key={day.date} className="text-slate-300">
                        <td className="py-3">
                          {format(parseISO(day.date), "dd 'de' MMM", { locale: ptBR })}
                        </td>
                        <td className="text-right font-medium text-red-400">{day.avg}</td>
                        <td className="text-right text-green-400">
                          {day.min === day.max ? (
                            <span className="text-slate-500" title="1 leitura apenas">~{day.min}</span>
                          ) : (
                            day.min
                          )}
                        </td>
                        <td className="text-right text-orange-400">
                          {day.min === day.max ? (
                            <span className="text-slate-500" title="1 leitura apenas">~{day.max}</span>
                          ) : (
                            day.max
                          )}
                        </td>
                        <td className="text-right">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${z.bg} ${z.color}`}>
                            {z.label}
                          </span>
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
