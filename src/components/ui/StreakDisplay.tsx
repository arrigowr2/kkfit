'use client';

import { StreakData } from '@/lib/gamification';
import { Flame, Calendar, Trophy } from 'lucide-react';

interface StreakDisplayProps {
  streak: StreakData;
}

export function StreakDisplay({ streak }: StreakDisplayProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Current Streak */}
      <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-orange-500/30 flex items-center justify-center">
            <Flame className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <p className="text-sm text-slate-400">Sequência Atual</p>
            <p className="text-2xl font-bold text-white">
              {streak.currentStreak}{' '}
              <span className="text-sm font-normal text-slate-400">
                {streak.currentStreak === 1 ? 'dia' : 'dias'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Longest Streak */}
      <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/30 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <p className="text-sm text-slate-400">Maior Sequência</p>
            <p className="text-2xl font-bold text-white">
              {streak.longestStreak}{' '}
              <span className="text-sm font-normal text-slate-400">
                {streak.longestStreak === 1 ? 'dia' : 'dias'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Last Active */}
      <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/30 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-slate-400">Última Atividade</p>
            <p className="text-lg font-bold text-white">
              {streak.lastActiveDate
                ? new Date(streak.lastActiveDate).toLocaleDateString('pt-BR', {
                    day: 'numeric',
                    month: 'short',
                  })
                : 'Nunca'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
