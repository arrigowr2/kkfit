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
  restingHR?: number;
  timeInZones?: {
    rest: number;
    fatBurn: number;
    cardio: number;
    peak: number;
  };
}

function getZone(bpm: number): { label: string; color: string; bg: string } {
  if (bpm < 60) return { label: "Abaixo do normal", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" };
  if (bpm <= 100) return { label: "Normal", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" };
  if (bpm <= 120) return { label: "Elevado", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" };
  return { label: "Alto", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" };
}

// Estimate heart rate zones based on average HR
// Using simplified zones: Rest (<60), Fat Burn (60-70% max), Cardio (70-85% max), Peak (>85% max)
function estimateTimeInZones(avgBpm: number, maxBpm: number, minBpm: number): { rest: number; fatBurn: number; cardio: number; peak: number } {
  // Estimate max HR (simplified: 220 - 30 years old as default)
  const estimatedMaxHR = maxBpm > 0 ? maxBpm : 190;
  const restingHR = minBpm > 0 ? minBpm : 60;
  
  // Zone boundaries (% of max HR)
  const fatBurnMin = Math.round(estimatedMaxHR * 0.6);
  const cardioMin = Math.round(estimatedMaxHR * 0.7);
  const peakMin = Math.round(estimatedMaxHR * 0.85);
  
  // Estimate time distribution (simplified model based on avg HR)
  let rest = 0, fatBurn = 0, cardio = 0, peak = 0;
  
  if (avgBpm < fatBurnMin) {
    // Mostly resting
    rest = 16 * 60; // ~16 hours
    fatBurn = 1 * 60;
    cardio = 0;
    peak = 0;
  } else if (avgBpm < cardioMin) {
    // Mix of rest and fat burn
    rest = 10 * 60;
    fatBurn = 6 * 60;
    cardio = 1 * 60;
    peak = 0;
  } else if (avgBpm < peakMin) {
    // Active day
    rest = 8 * 60;
    fatBurn = 6 * 60;
    cardio = 3 * 60;
    peak = 0;
  } else {
    // Very active day
    rest = 8 * 60;
    fatBurn = 4 * 60;
    cardio = 4 * 60;
    peak = 1 * 60;
  }
  
  return { rest, fatBurn, cardio, peak };
}

export default function HeartPageClient() {
  const [data, setData] = useState<HeartRateData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[HeartPage] Fetching heart rate data...");
    // Use days parameter to limit to 30 days
    fetch("/api/fitness/summary?date=today&days=30")
      .then((r) => {
        console.log("[HeartPage] Response status:", r.status);
        return r.json();
      })
      .then((d) => {
        console.log("[HeartPage] Response data:", d);
        console.log("[HeartPage] Heart rate array:", d.heartRate);
        if (d._debug?.heartRateDebug) {
          console.log("[HeartPage] Debug info:", JSON.stringify(d._debug.heartRateDebug, null, 2));
        } else {
          console.log("[HeartPage] No debug info available");
        }
        // Log each day's values for debugging
        if (d.heartRate && d.heartRate.length > 0) {
          console.log("[HeartPage] Detailed heart rate data:", 
            d.heartRate.map((day: { date: string; min: number; max: number; avg: number }) => `${day.date}: min=${day.min}, max=${day.max}, avg=${day.avg}`)
          );
        }
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
  
  // Use timeInZones from backend if available, otherwise calculate estimate
  // Aggregate timeInZones from all days with data
  const timeInZonesFromData = data.reduce(
    (acc, day) => ({
      rest: acc.rest + (day.timeInZones?.rest || 0),
      fatBurn: acc.fatBurn + (day.timeInZones?.fatBurn || 0),
      cardio: acc.cardio + (day.timeInZones?.cardio || 0),
      peak: acc.peak + (day.timeInZones?.peak || 0),
    }),
    { rest: 0, fatBurn: 0, cardio: 0, peak: 0 }
  );
  
  // Cap at 30 days * 24 hours = 720 hours (43200 minutes) per zone
  const maxMinutesPerZone = 43200;
  const timeInZonesCapped = {
    rest: Math.min(timeInZonesFromData.rest, maxMinutesPerZone),
    fatBurn: Math.min(timeInZonesFromData.fatBurn, maxMinutesPerZone),
    cardio: Math.min(timeInZonesFromData.cardio, maxMinutesPerZone),
    peak: Math.min(timeInZonesFromData.peak, maxMinutesPerZone),
  };
  
  // Use backend data if available, otherwise calculate estimate
  const hasTimeInZonesData = timeInZonesCapped.rest + timeInZonesCapped.fatBurn + timeInZonesCapped.cardio + timeInZonesCapped.peak > 0;
  const timeInZones = hasTimeInZonesData 
    ? timeInZonesCapped 
    : estimateTimeInZones(avgBpm, maxBpm, minBpm);

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

          {/* Zones */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-5">
            <h3 className="text-white font-semibold text-sm sm:text-base mb-3 sm:mb-4">
              Tempo Estimado por Zona
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-slate-800 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-slate-400 text-xs">Repouso</span>
                </div>
                <p className="text-lg font-bold text-blue-400">{Math.floor(timeInZones.rest / 60)}h {timeInZones.rest % 60}min</p>
                <p className="text-slate-500 text-xs">&lt; {Math.round(maxBpm * 0.6)} bpm</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="text-slate-400 text-xs">Queima Gordura</span>
                </div>
                <p className="text-lg font-bold text-green-400">{Math.floor(timeInZones.fatBurn / 60)}h {timeInZones.fatBurn % 60}min</p>
                <p className="text-slate-500 text-xs">{Math.round(maxBpm * 0.6)}-{Math.round(maxBpm * 0.7)} bpm</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <span className="text-slate-400 text-xs">Cardio</span>
                </div>
                <p className="text-lg font-bold text-yellow-400">{Math.floor(timeInZones.cardio / 60)}h {timeInZones.cardio % 60}min</p>
                <p className="text-slate-500 text-xs">{Math.round(maxBpm * 0.7)}-{Math.round(maxBpm * 0.85)} bpm</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-slate-400 text-xs">Pico</span>
                </div>
                <p className="text-lg font-bold text-red-400">{Math.floor(timeInZones.peak / 60)}h {timeInZones.peak % 60}min</p>
                <p className="text-slate-500 text-xs">&gt; {Math.round(maxBpm * 0.85)} bpm</p>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { label: "Repouso", value: timeInZones.rest, color: "bg-blue-500", total: 1440 },
                { label: "Queima Gordura", value: timeInZones.fatBurn, color: "bg-green-500", total: 1440 },
                { label: "Cardio", value: timeInZones.cardio, color: "bg-yellow-500", total: 1440 },
                { label: "Pico", value: timeInZones.peak, color: "bg-red-500", total: 1440 },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-300">{item.label}</span>
                    <span className="text-sm font-medium text-slate-400">
                      {Math.round((item.value / item.total) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${item.color}`}
                      style={{ width: `${(item.value / item.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Zones reference */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-5">
            <h3 className="text-white font-semibold text-sm sm:text-base mb-3 sm:mb-4">
              Referência de Zonas
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
