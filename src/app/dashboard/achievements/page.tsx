'use client';

import { useGamification } from '@/lib/hooks/useGamification';
import { useFitnessSummary } from '@/lib/hooks/useFitnessData';
import { LevelDisplay } from '@/components/ui/LevelDisplay';
import { StreakDisplay } from '@/components/ui/StreakDisplay';
import { BadgesDisplay } from '@/components/ui/BadgesDisplay';
import { BadgeNotification } from '@/components/ui/BadgeNotification';
import { DashboardSkeleton } from '@/components/ui/SkeletonLoaders';
import { Trophy } from 'lucide-react';

export default function AchievementsPage() {
  const { data: fitnessData, isLoading } = useFitnessSummary('total');
  
  // Transform fitness data for gamification
  const activityData = fitnessData?.steps?.map((step: { date: string; steps: number }) => ({
    date: step.date,
    steps: step.steps,
    calories: fitnessData.calories?.find((c: { date: string; calories: number }) => c.date === step.date)?.calories || 0,
    sleep: fitnessData.sleep?.find((s: { date: string; duration: number }) => s.date === step.date)?.duration || 0,
  })) || [];

  const {
    streak,
    earnedBadges,
    allBadges,
    recentBadge,
    clearRecentBadge,
    xp,
    level,
    levelProgress,
    totalBadges,
  } = useGamification(activityData);

  if (isLoading) {
    return (
      <DashboardSkeleton />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Conquistas</h1>
          <p className="text-slate-400">Acompanhe seu progresso e desbloqueie badges</p>
        </div>
      </div>

      {/* Level & XP */}
      <LevelDisplay
        level={level}
        xp={xp}
        progress={levelProgress}
        totalBadges={totalBadges}
        earnedBadges={earnedBadges.length}
      />

      {/* Streaks */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Sequência de Atividades</h2>
        <StreakDisplay streak={streak} />
      </div>

      {/* Badges */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Badges</h2>
          <span className="text-sm text-slate-400">
            {earnedBadges.length} de {totalBadges} desbloqueados
          </span>
        </div>
        <BadgesDisplay allBadges={allBadges} earnedBadges={earnedBadges} />
      </div>

      {/* Badge Notification */}
      <BadgeNotification badge={recentBadge} onClose={clearRecentBadge} />
    </div>
  );
}
