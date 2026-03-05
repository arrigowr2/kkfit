"use client";

import { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import StepsChart from "@/components/charts/StepsChart";
import HeartRateChart from "@/components/charts/HeartRateChart";
import CaloriesChart from "@/components/charts/CaloriesChart";
import SleepChart from "@/components/charts/SleepChart";
import WeightChart from "@/components/charts/WeightChart";
import { DashboardSkeleton } from "@/components/ui/SkeletonLoaders";
import { exportToCSV, exportToJSON, generateFitnessDataset } from "@/lib/export";
import { getGoals, saveGoals, calculateProgress, getProgressColor, getProgressText, UserGoals, DEFAULT_GOALS, checkGoalAchievements } from "@/lib/goals";

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
  weight: { date: string; weight: number }[];
  sleep: { date: string; duration: number; quality: string }[];
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
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
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
              className={`h-1.5 rounded-full transition-all duration-500 ${getProgressColor(progress)}`}
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
  if (isEmpty) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="mb-4">
          <h3 className="text-white font-semibold">{title}</h3>
          {subtitle && <p className="text-slate-400 text-xs mt-0.5">{subtitle}</p>}
        </div>
        <div className="h-[200px] flex items-center justify-center">
          <p className="text-slate-500 text-sm">Sem dados disponíveis</p>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="mb-4">
        <h3 className="text-white font-semibold">{title}</h3>
        {subtitle && <p className="text-slate-400 text-xs mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Notification({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg z-50">
      <div className="flex items-center gap-2">
        <span className="text-xl">🎉</span>
        <span className="font-medium">{message}</span>
        <button onClick={onClose} className="ml-2 hover:text-green-200">×</button>
      </div>
    </div>
  );
}

function GoalsModal({
  isOpen,
  onClose,
  goals,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  goals: UserGoals;
  onSave: (goals: UserGoals) => void;
}) {
  const [localGoals, setLocalGoals] = useState(goals);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full">
        <h3 className="text-xl font-bold text-white mb-4">🎯 Minhas Metas</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Passos Diários</label>
            <input
              type="number"
              value={localGoals.dailySteps}
              onChange={(e) => setLocalGoals({ ...localGoals, dailySteps: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Calorias Diárias</label>
            <input
              type="number"
              value={localGoals.dailyCalories}
              onChange={(e) => setLocalGoals({ ...localGoals, dailyCalories: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Minutos Ativos Semanais</label>
            <input
              type="number"
              value={localGoals.weeklyActiveMinutes}
              onChange={(e) => setLocalGoals({ ...localGoals, weeklyActiveMinutes: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Horas de Sono</label>
            <input
              type="number"
              value={localGoals.sleepHours}
              onChange={(e) => setLocalGoals({ ...localGoals, sleepHours: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => { onSave(localGoals); onClose(); }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 font-medium"
          >
            Salvar
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg py-2 font-medium"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardClient() {
  const [selectedMode, setSelectedMode] = useState<"today" | "yesterday" | "custom" | "total">("total");
  const [customDates, setCustomDates] = useState<string[]>([]);
  const [pendingDates, setPendingDates] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [goals, setGoals] = useState<UserGoals>(DEFAULT_GOALS);
  const [notification, setNotification] = useState<string | null>(null);
  
  // Data state (using fetch directly like ActivityPage)
  const [data, setData] = useState<FitnessData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load goals from localStorage
  useEffect(() => {
    setGoals(getGoals());
  }, []);

  // Fetch data function (similar to ActivityPageClient)
  const fetchData = useCallback(async (mode: string, dates?: string[]) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let url: string;
      if (mode === "total") {
        url = "/api/fitness/summary?date=total";
      } else if (mode === "today" && dates && dates.length > 0) {
        // Pass actual date from client (correct timezone) instead of "today"
        url = `/api/fitness/summary?date=${dates[0]}`;
      } else if (mode === "yesterday" && dates && dates.length > 0) {
        // Pass actual date from client (correct timezone) instead of "yesterday"
        url = `/api/fitness/summary?date=${dates[0]}`;
      } else if (mode === "custom" && dates && dates.length > 0) {
        url = `/api/fitness/summary?date=${dates.join(",")}&mode=multiple`;
      } else {
        url = "/api/fitness/summary?date=total";
      }
      
      console.log("[DashboardClient] Fetching:", { mode, dates, url });
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const result = await response.json();
      console.log("[DashboardClient] Response:", { 
        targetDate: result.targetDate, 
        today: result.today,
        stepsCount: result.steps?.length,
        firstStepDate: result.steps?.[0]?.date,
        lastStepDate: result.steps?.[result.steps?.length - 1]?.date
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData("total");
  }, [fetchData]);

  // Check for goal achievements when data loads
  useEffect(() => {
    if (data?.today && selectedMode === "today") {
      const achievements = checkGoalAchievements(
        {
          steps: data.today?.steps,
          calories: data.today?.calories,
        },
        goals,
        new Date().toISOString().split("T")[0]
      );

      if (achievements.length > 0) {
        const achievement = achievements[0];
        const messages: Record<string, string> = {
          steps: `Meta de passos atingida! ${achievement.value} passos 🎉`,
          calories: `Meta de calorias atingida! ${achievement.value} kcal 🔥`,
          activeMinutes: `Meta de atividade atingida! ${achievement.value} min ⚡`,
          sleep: `Meta de sono atingida! ${achievement.value}h 😴`,
        };
        setNotification(messages[achievement.type]);
      }
    }
  }, [data, goals, selectedMode]);

  const quickDates = [
    { label: "Total", value: "total", mode: "total" as const },
    { label: "Hoje", value: "today", mode: "today" as const },
    { label: "Ontem", value: "yesterday", mode: "yesterday" as const },
  ];

  // Helper to get local date string in YYYY-MM-DD format (defined before use)
  const getLocalDateStr = useCallback((date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const handleQuickDate = useCallback((mode: "today" | "yesterday" | "custom" | "total") => {
    setSelectedMode(mode);
    if (mode === "custom") {
      setShowDatePicker(true);
    } else {
      setCustomDates([]);
      setPendingDates([]);
      // For today/yesterday, pass the actual date string from client (correct timezone)
      // instead of letting server calculate (server is UTC)
      if (mode === "today") {
        const todayStr = getLocalDateStr();
        fetchData(mode, [todayStr]);
      } else if (mode === "yesterday") {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalDateStr(yesterday);
        fetchData(mode, [yesterdayStr]);
      } else {
        // Fetch data immediately for non-custom modes
        fetchData(mode);
      }
    }
  }, [fetchData, getLocalDateStr]);

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      setPendingDates((prev) => {
        const newDates = prev.includes(dateValue)
          ? prev.filter((d) => d !== dateValue)
          : [...prev, dateValue].sort();
        return newDates;
      });
    }
  }, []);

  const handleApplyDates = useCallback(() => {
    if (pendingDates.length > 0) {
      setCustomDates(pendingDates);
      setSelectedMode("custom");
      setShowDatePicker(false);
      // Fetch data for custom dates
      fetchData("custom", pendingDates);
    } else {
      setShowDatePicker(false);
    }
  }, [pendingDates, fetchData]);

  const handleExportCSV = useCallback(() => {
    if (!data) return;
    // Map activity data to include steps and calories from separate arrays
    const activityData = (data.activity || []).map((a) => {
      const stepsEntry = data.steps?.find(s => s.date === a.date);
      const caloriesEntry = data.calories?.find(c => c.date === a.date);
      return {
        date: a.date,
        steps: stepsEntry?.steps || 0,
        calories: caloriesEntry?.calories || 0,
        distance: a.distance,
        activeMinutes: a.activeMinutes,
      };
    });
    const dataset = generateFitnessDataset(
      (data.steps || []).map((s: {date: string; steps: number}) => ({ date: s.date, value: s.steps })),
      (data.calories || []).map((c: {date: string; calories: number}) => ({ date: c.date, value: c.calories })),
      data.heartRate || [],
      (data.weight || []).map((w: {date: string; weight: number}) => ({ date: w.date, value: w.weight })),
      (data.sleep || []).map((s: {date: string; duration: number}) => ({ date: s.date, hours: Math.floor(s.duration / 60), minutes: s.duration % 60 })),
      activityData
    );
    exportToCSV(dataset, "fitness_data");
  }, [data]);

  const handleExportJSON = useCallback(() => {
    if (!data) return;
    // Map activity data to include steps and calories from separate arrays
    const activityData = (data.activity || []).map((a) => {
      const stepsEntry = data.steps?.find(s => s.date === a.date);
      const caloriesEntry = data.calories?.find(c => c.date === a.date);
      return {
        date: a.date,
        steps: stepsEntry?.steps || 0,
        calories: caloriesEntry?.calories || 0,
        distance: a.distance,
        activeMinutes: a.activeMinutes,
      };
    });
    const dataset = generateFitnessDataset(
      (data.steps || []).map((s: {date: string; steps: number}) => ({ date: s.date, value: s.steps })),
      (data.calories || []).map((c: {date: string; calories: number}) => ({ date: c.date, value: c.calories })),
      data.heartRate || [],
      (data.weight || []).map((w: {date: string; weight: number}) => ({ date: w.date, value: w.weight })),
      (data.sleep || []).map((s: {date: string; duration: number}) => ({ date: s.date, hours: Math.floor(s.duration / 60), minutes: s.duration % 60 })),
      activityData
    );
    exportToJSON(dataset, "fitness_data");
  }, [data]);

  const handleSaveGoals = useCallback((newGoals: UserGoals) => {
    setGoals(newGoals);
    saveGoals(newGoals);
  }, []);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isFitnessApiError = errorMessage.includes("403") || errorMessage.includes("fitness");
    const isUnauthorized = errorMessage.includes("401") || errorMessage.includes("Unauthorized");

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="text-4xl">⚠️</div>
        <p className="text-red-400 font-medium text-center">Erro ao carregar dados do Google Fit</p>
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-lg w-full space-y-3">
          <p className="text-slate-300 text-sm font-medium">Detalhes do erro:</p>
          <p className="text-red-300 text-xs font-mono bg-slate-800 rounded p-2 break-all">{errorMessage}</p>

          {isFitnessApiError && (
            <div className="text-slate-400 text-sm space-y-1">
              <p className="font-medium text-yellow-400">🔧 Possível solução:</p>
              <p>A <strong className="text-white">Fitness API</strong> pode não estar ativada no Google Cloud Console.</p>
              <ol className="list-decimal list-inside space-y-1 text-xs mt-2">
                <li>Acesse <span className="text-blue-400">console.cloud.google.com</span></li>
                <li>Vá em <strong className="text-white">APIs & Services → Library</strong></li>
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
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fetchData(selectedMode, customDates.length > 0 ? customDates : undefined)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Tentar novamente
          </button>
          <button
            onClick={() => signOut({ callbackUrl: `${window.location.origin}/` })}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm"
          >
            Fazer logout
          </button>
        </div>
        <div className="flex gap-3 mt-1">
          <Link href="/signout" className="text-xs text-slate-500 hover:text-slate-300 underline">
            Forçar logout
          </Link>
          <span className="text-slate-700 text-xs">·</span>
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 underline">
            Ir para a página inicial
          </Link>
        </div>
      </div>
    );
  }

  const today: TodaySummary | null = data?.today || null;
  const hasStepsData = today && today.steps > 0;
  const hasCaloriesData = today && today.calories > 0;
  const hasActiveMinutesData = today && today.activeMinutes > 0;
  const hasDistanceData = today && (today.distance || 0) > 0;

  // Calculate averages
  const avgSteps = data?.steps && data.steps.length > 0
    ? Math.round(data.steps.reduce((a: number, b: {steps: number}) => a + b.steps, 0) / data.steps.length)
    : 0;

  const avgSleep = data?.sleep && data.sleep.length > 0
    ? Math.round(data.sleep.reduce((a: number, b: {duration: number}) => a + b.duration, 0) / data.sleep.length)
    : 0;

  const latestWeight = data?.weight && data.weight.length > 0 ? data.weight[data.weight.length - 1].weight : null;
  const latestHeartRate = data?.heartRate && data.heartRate.length > 0 ? data.heartRate[data.heartRate.length - 1].avg : null;

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <Notification message={notification} onClose={() => setNotification(null)} />
      )}

      {/* Goals Modal */}
      <GoalsModal
        isOpen={showGoalsModal}
        onClose={() => setShowGoalsModal(false)}
        goals={goals}
        onSave={handleSaveGoals}
      />

      {/* Header with Date Selector and Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Visão Geral</h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Export buttons */}
          <button
            onClick={handleExportCSV}
            disabled={!data}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800/50 text-slate-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            CSV
          </button>
          <button
            onClick={handleExportJSON}
            disabled={!data}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800/50 text-slate-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            JSON
          </button>
          <button
            onClick={() => setShowGoalsModal(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Metas
          </button>
          
          {/* Date buttons */}
          {quickDates.map((q) => (
            <button
              key={q.mode}
              onClick={() => handleQuickDate(q.mode)}
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
              {selectedMode === "custom" && customDates.length > 0 
                ? `${customDates.length} dia(s)`
                : "Personalizado"}
            </button>
            
            {showDatePicker && (
              <div className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-xl z-10 min-w-[250px]">
                <input
                  type="date"
                  onChange={handleDateChange}
                  max={getLocalDateStr()}
                  className="bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-blue-500 focus:outline-none w-full"
                />
                
                {pendingDates.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs text-slate-400">Datas selecionadas:</p>
                    <div className="flex flex-wrap gap-1">
                      {pendingDates.map((date) => (
                        <span key={date} className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded">
                          {new Date(date + "T00:00:00").toLocaleDateString("pt-BR")}
                          <button
                            onClick={() => setPendingDates((prev) => prev.filter((d) => d !== date))}
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
                    className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                  >
                    Ver {pendingDates.length} dia(s)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Today's Summary */}
      {today && (hasStepsData || hasCaloriesData || hasActiveMinutesData || hasDistanceData) && (
        <div>
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">Hoje</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {hasStepsData && (
              <StatCard
                icon="👟"
                label="Passos"
                value={(today?.steps || 0).toLocaleString("pt-BR")}
                unit="passos"
                color="text-blue-400"
                progress={calculateProgress(today.steps, goals.dailySteps)}
                goal={`${goals.dailySteps.toLocaleString("pt-BR")}`}
              />
            )}
            {hasCaloriesData && (
              <StatCard
                icon="🔥"
                label="Calorias"
                value={(today?.calories || 0).toLocaleString("pt-BR")}
                unit="kcal"
                color="text-orange-400"
                progress={calculateProgress(today.calories, goals.dailyCalories)}
                goal={`${goals.dailyCalories.toLocaleString("pt-BR")} kcal`}
              />
            )}
            {hasActiveMinutesData && (
              <StatCard
                icon="⚡"
                label="Min. Ativos"
                value={today?.activeMinutes || 0}
                unit="min"
                color="text-yellow-400"
                progress={calculateProgress(today.activeMinutes, Math.round(goals.weeklyActiveMinutes / 7))}
                goal={`${Math.round(goals.weeklyActiveMinutes / 7)} min`}
              />
            )}
            {hasDistanceData && (
              <StatCard
                icon="📍"
                label="Distância"
                value={today ? ((today.distance || 0) / 1000).toFixed(2) : "0.00"}
                unit="km"
                color="text-cyan-400"
              />
            )}
          </div>
          
          {/* Progress message */}
          {today && (today.steps > 0 || today.calories > 0) && (
            <p className="text-sm text-slate-400 mt-2">
              {getProgressText(calculateProgress(today.steps, goals.dailySteps))}
            </p>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Passos Diários"
          subtitle={selectedMode === "custom" ? `${customDates.length} dias selecionados` : "Últimos 14 dias"}
          isEmpty={!data?.steps || data.steps.length === 0}
        >
          <StepsChart data={data?.steps || []} />
        </ChartCard>

        <ChartCard
          title="Calorias Queimadas"
          subtitle={selectedMode === "custom" ? `${customDates.length} dias selecionados` : "Últimos 14 dias"}
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
          subtitle={`Meta: ${goals.sleepHours}h`}
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
      </div>

      {/* Health Insights */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">💡 Insights de Saúde</h3>
        <div className="space-y-3">
          {avgSteps > 0 && (
            <div className={`flex items-start gap-3 p-3 rounded-xl ${
              avgSteps >= goals.dailySteps
                ? "bg-green-500/10 border border-green-500/20"
                : avgSteps >= goals.dailySteps * 0.75
                  ? "bg-yellow-500/10 border border-yellow-500/20"
                  : "bg-red-500/10 border border-red-500/20"
            }`}>
              <span className="text-lg">👟</span>
              <div>
                <p className={`text-sm font-medium ${
                  avgSteps >= goals.dailySteps
                    ? "text-green-400"
                    : avgSteps >= goals.dailySteps * 0.75
                      ? "text-yellow-400"
                      : "text-red-400"
                }`}>
                  {avgSteps >= goals.dailySteps
                    ? "Excelente! Você está atingindo sua meta de passos."
                    : avgSteps >= goals.dailySteps * 0.75
                      ? "Bom progresso! Você está perto da meta."
                      : "Tente aumentar sua caminhada diária para atingir sua meta."}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  Média: {avgSteps.toLocaleString("pt-BR")} passos/dia (Meta: {goals.dailySteps.toLocaleString("pt-BR")})
                </p>
              </div>
            </div>
          )}

          {avgSleep > 0 && (
            <div className={`flex items-start gap-3 p-3 rounded-xl ${
              avgSleep >= goals.sleepHours * 60
                ? "bg-green-500/10 border border-green-500/20"
                : avgSleep >= (goals.sleepHours - 1) * 60
                  ? "bg-yellow-500/10 border border-yellow-500/20"
                  : "bg-red-500/10 border border-red-500/20"
            }`}>
              <span className="text-lg">😴</span>
              <div>
                <p className={`text-sm font-medium ${
                  avgSleep >= goals.sleepHours * 60
                    ? "text-green-400"
                    : avgSleep >= (goals.sleepHours - 1) * 60
                      ? "text-yellow-400"
                      : "text-red-400"
                }`}>
                  {avgSleep >= goals.sleepHours * 60
                    ? "Ótima qualidade de sono! Continue assim."
                    : avgSleep >= (goals.sleepHours - 1) * 60
                      ? "Seu sono está um pouco abaixo do ideal."
                      : "Você está dormindo menos do que o recomendado."}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  Média: {Math.floor(avgSleep / 60)}h {avgSleep % 60}min/noite
                </p>
              </div>
            </div>
          )}

          {latestHeartRate && (
            <div className={`flex items-start gap-3 p-3 rounded-xl ${
              latestHeartRate >= 60 && latestHeartRate <= 100
                ? "bg-green-500/10 border border-green-500/20"
                : "bg-yellow-500/10 border border-yellow-500/20"
            }`}>
              <span className="text-lg">❤️</span>
              <div>
                <p className={`text-sm font-medium ${
                  latestHeartRate >= 60 && latestHeartRate <= 100 ? "text-green-400" : "text-yellow-400"
                }`}>
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
