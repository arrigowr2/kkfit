"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import StepsChart from "@/components/charts/StepsChart";
import HeartRateChart from "@/components/charts/HeartRateChart";
import CaloriesChart from "@/components/charts/CaloriesChart";
import SleepChart from "@/components/charts/SleepChart";
import WeightChart from "@/components/charts/WeightChart";

interface TodaySummary {
  steps: number;
  calories: number;
  activeMinutes: number;
  distance: number;
}

interface FitnessData {
  today: TodaySummary | null;
  steps: { date: string; steps: number }[];
  calories: { date: string; calories: number }[];
  heartRate: { date: string; avg: number; min: number; max: number }[];
  sleep: { date: string; duration: number; quality: string }[];
  weight: { date: string; weight: number }[];
  activity: { date: string; activeMinutes: number; distance: number }[];
}

function StatCard({
  icon,
  label,
  value,
  unit,
  color,
  progress,
  goal,
}: {
  icon: string;
  label: string;
  value: string | number;
  unit: string;
  color: string;
  progress?: number;
  goal?: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">
            {label}
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-2xl font-bold ${color}`}>{value}</span>
            <span className="text-slate-400 text-sm">{unit}</span>
          </div>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
      {progress !== undefined && (
        <div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${
                progress >= 100
                  ? "bg-green-500"
                  : progress >= 70
                    ? "bg-blue-500"
                    : "bg-slate-600"
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          {goal && (
            <p className="text-xs text-slate-500 mt-1">Meta: {goal}</p>
          )}
        </div>
      )}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  isEmpty,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  isEmpty?: boolean;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="mb-4">
        <h3 className="text-white font-semibold">{title}</h3>
        {subtitle && <p className="text-slate-400 text-xs mt-0.5">{subtitle}</p>}
      </div>
      {isEmpty ? (
        <div className="h-[200px] flex items-center justify-center">
          <p className="text-slate-500 text-sm">Sem dados disponíveis</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function TrendBadge({ data, key: dataKey }: { data: number[]; key?: string }) {
  if (data.length < 2) return null;
  const recent = data.slice(-7);
  const prev = data.slice(-14, -7);
  if (prev.length === 0) return null;

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const prevAvg = prev.reduce((a, b) => a + b, 0) / prev.length;
  const diff = ((recentAvg - prevAvg) / prevAvg) * 100;

  if (Math.abs(diff) < 1) return null;

  const isPositive = diff > 0;
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full ${
        isPositive
          ? "bg-green-500/20 text-green-400"
          : "bg-red-500/20 text-red-400"
      }`}
    >
      {isPositive ? "↑" : "↓"} {Math.abs(diff).toFixed(1)}%
    </span>
  );
}

export default function DashboardClient() {
  const [data, setData] = useState<FitnessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(""); // empty = today
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Quick date options
  const quickDates = [
    { label: "Hoje", value: "", getDate: () => new Date() },
    { label: "Ontem", value: "yesterday", getDate: () => { const d = new Date(); d.setDate(d.getDate() - 1); return d; } },
  ];

  const fetchData = (date: string) => {
    setLoading(true);
    setError(null);
    const url = date ? `/api/fitness/summary?date=${date}` : "/api/fitness/summary";
    fetch(url)
      .then((res) => {
        if (!res.ok) {
          return res.json().then((body) => {
            throw new Error(body?.error || "Falha ao carregar dados");
          });
        }
        return res.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  // Initial data fetch
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch("/api/fitness/summary")
      .then((res) => {
        if (!res.ok) {
          return res.json().then((body) => {
            throw new Error(body?.error || "Falha ao carregar dados");
          });
        }
        return res.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/set-state-in-effect
  }, []);

  const handleQuickDate = (value: string) => {
    setSelectedDate(value);
    setShowDatePicker(false);
    fetchData(value);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      // Convert to the format expected by API
      const date = new Date(dateValue);
      const dateStr = date.toISOString().split("T")[0];
      setSelectedDate(dateStr);
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-slate-400">Carregando seus dados de saúde...</p>
      </div>
    );
  }

  if (error) {
    const isFitnessApiError = error.includes("403") || error.includes("fitness") || error.includes("Fitness");
    const isUnauthorized = error.includes("401") || error.includes("Unauthorized");

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="text-4xl">⚠️</div>
        <p className="text-red-400 font-medium text-center">Erro ao carregar dados do Google Fit</p>
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-lg w-full space-y-3">
          <p className="text-slate-300 text-sm font-medium">Detalhes do erro:</p>
          <p className="text-red-300 text-xs font-mono bg-slate-800 rounded p-2 break-all">{error}</p>

          {isFitnessApiError && (
            <div className="text-slate-400 text-sm space-y-1">
              <p className="font-medium text-yellow-400">🔧 Possível solução:</p>
              <p>A <strong className="text-white">Fitness API</strong> pode não estar ativada no Google Cloud Console.</p>
              <ol className="list-decimal list-inside space-y-1 text-xs mt-2">
                <li>Acesse <span className="text-blue-400">console.cloud.google.com</span></li>
                <li>Vá em <strong className="text-white">APIs &amp; Services → Library</strong></li>
                <li>Busque por <strong className="text-white">&quot;Fitness API&quot;</strong></li>
                <li>Clique em <strong className="text-white">Enable</strong></li>
                <li>Faça logout e login novamente para renovar as permissões</li>
              </ol>
            </div>
          )}

          {isUnauthorized && (
            <div className="text-slate-400 text-sm space-y-1">
              <p className="font-medium text-yellow-400">🔧 Possível solução:</p>
              <p>Sua sessão expirou. Faça logout e login novamente.</p>
            </div>
          )}

          {!isFitnessApiError && !isUnauthorized && (
            <div className="text-slate-400 text-sm space-y-1">
              <p className="font-medium text-yellow-400">🔧 Possíveis soluções:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Verifique se a <strong className="text-white">Fitness API</strong> está ativada no Google Cloud Console</li>
                <li>Verifique se você concedeu todas as permissões ao fazer login</li>
                <li>Faça logout e login novamente</li>
              </ul>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              console.log("[DashboardClient] Retry button clicked");
              window.location.reload();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Tentar novamente
          </button>
          <button
            onClick={() => {
              console.log("[DashboardClient] Logout button clicked, calling signOut");
              signOut({ callbackUrl: `${window.location.origin}/` }).catch((err) => {
                console.error("[DashboardClient] signOut error:", err);
                window.location.href = "/api/auth/signout";
              });
            }}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm"
          >
            Fazer logout
          </button>
        </div>
        <div className="flex gap-3 mt-1">
          <Link
            href="/signout"
            className="text-xs text-slate-500 hover:text-slate-300 underline"
          >
            Forçar logout
          </Link>
          <span className="text-slate-700 text-xs">·</span>
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-300 underline"
          >
            Ir para a página inicial
          </Link>
        </div>
      </div>
    );
  }

  const today = data?.today;
  const stepsGoal = 10000;
  const caloriesGoal = 2000;
  const activeMinutesGoal = 30;

  const avgSteps =
    data?.steps && data.steps.length > 0
      ? Math.round(
          data.steps.reduce((a, b) => a + b.steps, 0) / data.steps.length
        )
      : 0;

  const avgSleep =
    data?.sleep && data.sleep.length > 0
      ? Math.round(
          data.sleep.reduce((a, b) => a + b.duration, 0) / data.sleep.length
        )
      : 0;

  const latestWeight =
    data?.weight && data.weight.length > 0
      ? data.weight[data.weight.length - 1].weight
      : null;

  const latestHeartRate =
    data?.heartRate && data.heartRate.length > 0
      ? data.heartRate[data.heartRate.length - 1].avg
      : null;

  return (
    <div className="space-y-6">
      {/* Header with Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Visão Geral</h1>
          <p className="text-slate-400 text-sm mt-1">
            Seus dados de saúde dos últimos 30 dias
          </p>
        </div>
        
        {/* Date Selector */}
        <div className="flex items-center gap-2">
          {/* Quick date buttons */}
          {quickDates.map((q) => (
            <button
              key={q.value}
              onClick={() => handleQuickDate(q.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedDate === q.value
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
                selectedDate && !quickDates.find(q => q.value === selectedDate)
                  ? "bg-blue-500 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {selectedDate && !quickDates.find(q => q.value === selectedDate) 
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

      {/* Today's summary */}
      <div>
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">
          Hoje
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon="👟"
            label="Passos"
            value={(today?.steps || 0).toLocaleString("pt-BR")}
            unit="passos"
            color="text-blue-400"
            progress={today ? (today.steps / stepsGoal) * 100 : 0}
            goal={`${stepsGoal.toLocaleString("pt-BR")}`}
          />
          <StatCard
            icon="🔥"
            label="Calorias"
            value={(today?.calories || 0).toLocaleString("pt-BR")}
            unit="kcal"
            color="text-orange-400"
            progress={today ? (today.calories / caloriesGoal) * 100 : 0}
            goal={`${caloriesGoal.toLocaleString("pt-BR")} kcal`}
          />
          <StatCard
            icon="⚡"
            label="Min. Ativos"
            value={today?.activeMinutes || 0}
            unit="min"
            color="text-yellow-400"
            progress={
              today ? (today.activeMinutes / activeMinutesGoal) * 100 : 0
            }
            goal={`${activeMinutesGoal} min`}
          />
          <StatCard
            icon="📍"
            label="Distância"
            value={
              today ? ((today.distance || 0) / 1000).toFixed(2) : "0.00"
            }
            unit="km"
            color="text-cyan-400"
          />
        </div>
      </div>

      {/* 30-day averages */}
      <div>
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">
          Médias (30 dias)
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon="📊"
            label="Média de Passos"
            value={avgSteps.toLocaleString("pt-BR")}
            unit="passos/dia"
            color="text-blue-400"
          />
          <StatCard
            icon="😴"
            label="Média de Sono"
            value={`${Math.floor(avgSleep / 60)}h ${avgSleep % 60}min`}
            unit=""
            color="text-purple-400"
          />
          <StatCard
            icon="⚖️"
            label="Peso Atual"
            value={latestWeight ? latestWeight.toFixed(1) : "—"}
            unit="kg"
            color="text-emerald-400"
          />
          <StatCard
            icon="❤️"
            label="Freq. Cardíaca"
            value={latestHeartRate || "—"}
            unit="bpm"
            color="text-red-400"
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Passos Diários"
          subtitle="Últimos 14 dias"
          isEmpty={!data?.steps || data.steps.length === 0}
        >
          <StepsChart data={data?.steps || []} />
        </ChartCard>

        <ChartCard
          title="Calorias Queimadas"
          subtitle="Últimos 14 dias"
          isEmpty={!data?.calories || data.calories.length === 0}
        >
          <CaloriesChart data={data?.calories || []} />
        </ChartCard>

        <ChartCard
          title="Frequência Cardíaca"
          subtitle="Média, mínima e máxima diária"
          isEmpty={!data?.heartRate || data.heartRate.length === 0}
        >
          <HeartRateChart data={data?.heartRate || []} />
        </ChartCard>

        <ChartCard
          title="Qualidade do Sono"
          subtitle="Duração por noite (meta: 7h)"
          isEmpty={!data?.sleep || data.sleep.length === 0}
        >
          <SleepChart data={data?.sleep || []} />
        </ChartCard>

        {data?.weight && data.weight.length > 0 && (
          <ChartCard
            title="Histórico de Peso"
            subtitle="Evolução nos últimos 90 dias"
            isEmpty={false}
          >
            <WeightChart data={data.weight} />
          </ChartCard>
        )}

        {/* Activity summary */}
        {data?.activity && data.activity.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-1">
              Resumo de Atividade
            </h3>
            <p className="text-slate-400 text-xs mb-4">
              Últimos 30 dias
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-xl p-4">
                <p className="text-slate-400 text-xs mb-1">Total de Passos</p>
                <p className="text-2xl font-bold text-blue-400">
                  {data.steps
                    .reduce((a, b) => a + b.steps, 0)
                    .toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4">
                <p className="text-slate-400 text-xs mb-1">Distância Total</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {(
                    data.activity.reduce((a, b) => a + b.distance, 0) / 1000
                  ).toFixed(1)}{" "}
                  <span className="text-sm font-normal text-slate-400">km</span>
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4">
                <p className="text-slate-400 text-xs mb-1">Min. Ativos Total</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {data.activity
                    .reduce((a, b) => a + b.activeMinutes, 0)
                    .toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4">
                <p className="text-slate-400 text-xs mb-1">Dias com Meta</p>
                <p className="text-2xl font-bold text-green-400">
                  {data.steps.filter((d) => d.steps >= 10000).length}
                  <span className="text-sm font-normal text-slate-400">
                    {" "}
                    / {data.steps.length}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Health insights */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">💡 Insights de Saúde</h3>
        <div className="space-y-3">
          {avgSteps > 0 && (
            <div
              className={`flex items-start gap-3 p-3 rounded-xl ${
                avgSteps >= 10000
                  ? "bg-green-500/10 border border-green-500/20"
                  : avgSteps >= 7500
                    ? "bg-yellow-500/10 border border-yellow-500/20"
                    : "bg-red-500/10 border border-red-500/20"
              }`}
            >
              <span className="text-lg">👟</span>
              <div>
                <p
                  className={`text-sm font-medium ${
                    avgSteps >= 10000
                      ? "text-green-400"
                      : avgSteps >= 7500
                        ? "text-yellow-400"
                        : "text-red-400"
                  }`}
                >
                  {avgSteps >= 10000
                    ? "Excelente! Você está atingindo sua meta de passos."
                    : avgSteps >= 7500
                      ? "Bom progresso! Você está perto da meta de 10.000 passos."
                      : "Tente aumentar sua caminhada diária para atingir 10.000 passos."}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  Média: {avgSteps.toLocaleString("pt-BR")} passos/dia
                </p>
              </div>
            </div>
          )}

          {avgSleep > 0 && (
            <div
              className={`flex items-start gap-3 p-3 rounded-xl ${
                avgSleep >= 420
                  ? "bg-green-500/10 border border-green-500/20"
                  : avgSleep >= 360
                    ? "bg-yellow-500/10 border border-yellow-500/20"
                    : "bg-red-500/10 border border-red-500/20"
              }`}
            >
              <span className="text-lg">😴</span>
              <div>
                <p
                  className={`text-sm font-medium ${
                    avgSleep >= 420
                      ? "text-green-400"
                      : avgSleep >= 360
                        ? "text-yellow-400"
                        : "text-red-400"
                  }`}
                >
                  {avgSleep >= 420
                    ? "Ótima qualidade de sono! Continue assim."
                    : avgSleep >= 360
                      ? "Seu sono está um pouco abaixo do ideal. Tente dormir mais 30 minutos."
                      : "Você está dormindo menos do que o recomendado. Priorize 7-8 horas de sono."}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  Média: {Math.floor(avgSleep / 60)}h {avgSleep % 60}min/noite
                </p>
              </div>
            </div>
          )}

          {latestHeartRate && (
            <div
              className={`flex items-start gap-3 p-3 rounded-xl ${
                latestHeartRate >= 60 && latestHeartRate <= 100
                  ? "bg-green-500/10 border border-green-500/20"
                  : "bg-yellow-500/10 border border-yellow-500/20"
              }`}
            >
              <span className="text-lg">❤️</span>
              <div>
                <p
                  className={`text-sm font-medium ${
                    latestHeartRate >= 60 && latestHeartRate <= 100
                      ? "text-green-400"
                      : "text-yellow-400"
                  }`}
                >
                  {latestHeartRate >= 60 && latestHeartRate <= 100
                    ? "Frequência cardíaca em repouso normal."
                    : "Frequência cardíaca fora da faixa normal. Consulte um médico."}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  Último registro: {latestHeartRate} bpm (normal: 60-100 bpm)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
