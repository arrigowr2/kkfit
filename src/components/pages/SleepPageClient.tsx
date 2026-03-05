"use client";

import { useEffect, useState } from "react";
import SleepChart from "@/components/charts/SleepChart";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SleepData {
  date: string;
  duration: number;
  quality: string;
}

export default function SleepPageClient() {
  const [data, setData] = useState<SleepData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/fitness/summary")
      .then((r) => r.json())
      .then((d) => {
        setData(d.sleep || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  const avgDuration =
    data.length > 0
      ? Math.round(data.reduce((a, b) => a + b.duration, 0) / data.length)
      : 0;

  const goodNights = data.filter((d) => d.quality === "Boa").length;
  const regularNights = data.filter((d) => d.quality === "Regular").length;
  const badNights = data.filter((d) => d.quality === "Insuficiente").length;

  const longestSleep = data.length > 0 ? Math.max(...data.map((d) => d.duration)) : 0;
  const shortestSleep = data.length > 0 ? Math.min(...data.map((d) => d.duration)) : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Qualidade do Sono</h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1">
          Análise dos últimos 30 dias
        </p>
      </div>

      {data.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
          <p className="text-4xl mb-3">😴</p>
          <p className="text-slate-400">Nenhum dado de sono encontrado.</p>
          <p className="text-slate-500 text-sm mt-1">
            Use um dispositivo compatível com Google Fit para registrar seu sono.
          </p>
          <div className="mt-4 space-y-2 text-sm text-slate-500">
            <p>💡 <strong>Possíveis causas:</strong></p>
            <ul className="text-left inline-block space-y-1">
              <li>• Você não possui dados de sono registrados no Google Fit</li>
              <li>• O dispositivo não está sincronizando dados de sono</li>
              <li>• Os dados estão em outro aplicativo (Samsung Health, Garmin, etc.)</li>
            </ul>
          </div>
          <p className="text-slate-500 text-sm mt-4">
            <a href="/signout" className="text-blue-400 hover:underline">
              Sair e fazer login novamente
            </a>{" "}
            pode ajudar se for um problema de permissão.
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">
                Média por Noite
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-purple-400">
                  {Math.floor(avgDuration / 60)}h {avgDuration % 60}min
                </span>
              </div>
              <div
                className={`mt-2 text-xs px-2 py-0.5 rounded-full inline-block ${
                  avgDuration >= 420
                    ? "bg-green-500/20 text-green-400"
                    : avgDuration >= 360
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-red-500/20 text-red-400"
                }`}
              >
                {avgDuration >= 420
                  ? "Boa qualidade"
                  : avgDuration >= 360
                    ? "Regular"
                    : "Insuficiente"}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">
                Noites Boas
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-green-400">
                  {goodNights}
                </span>
                <span className="text-slate-400 text-sm">noites</span>
              </div>
              <p className="text-slate-500 text-xs mt-2">≥ 7 horas</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">
                Mais Longa
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-purple-400">
                  {Math.floor(longestSleep / 60)}h {longestSleep % 60}min
                </span>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">
                Mais Curta
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-red-400">
                  {Math.floor(shortestSleep / 60)}h {shortestSleep % 60}min
                </span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-1">
              Duração do Sono por Noite
            </h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-xs text-slate-400">Boa (≥7h)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-xs text-slate-400">Regular (6-7h)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs text-slate-400">Insuficiente (&lt;6h)</span>
              </div>
            </div>
            <SleepChart data={data} />
          </div>

          {/* Quality breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4">
              Distribuição de Qualidade
            </h3>
            <div className="space-y-3">
              {[
                { label: "Boa (≥ 7h)", count: goodNights, color: "bg-purple-500", textColor: "text-purple-400" },
                { label: "Regular (6-7h)", count: regularNights, color: "bg-amber-500", textColor: "text-amber-400" },
                { label: "Insuficiente (< 6h)", count: badNights, color: "bg-red-500", textColor: "text-red-400" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-300">{item.label}</span>
                    <span className={`text-sm font-medium ${item.textColor}`}>
                      {item.count} noites
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${item.color}`}
                      style={{
                        width: `${data.length > 0 ? (item.count / data.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* History table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4">Histórico de Sono</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs uppercase tracking-wide border-b border-slate-800">
                    <th className="text-left pb-3">Data</th>
                    <th className="text-right pb-3">Duração</th>
                    <th className="text-right pb-3">Qualidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {[...data].reverse().slice(0, 14).map((day) => (
                    <tr key={day.date} className="text-slate-300">
                      <td className="py-3">
                        {format(parseISO(day.date), "dd 'de' MMM", { locale: ptBR })}
                      </td>
                      <td className="text-right font-medium text-purple-400">
                        {Math.floor(day.duration / 60)}h {day.duration % 60}min
                      </td>
                      <td className="text-right">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            day.quality === "Boa"
                              ? "bg-green-500/20 text-green-400"
                              : day.quality === "Regular"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {day.quality}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
