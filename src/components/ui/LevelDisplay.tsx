'use client';

import { Star, Zap } from 'lucide-react';

interface LevelDisplayProps {
  level: number;
  xp: number;
  progress: {
    current: number;
    needed: number;
    percentage: number;
  };
  totalBadges: number;
  earnedBadges: number;
}

export function LevelDisplay({ level, xp, progress, totalBadges, earnedBadges }: LevelDisplayProps) {
  return (
    <div className="bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <span className="text-2xl font-bold text-white">{level}</span>
          </div>
          <div>
            <p className="text-sm text-slate-400">Nível</p>
            <h3 className="text-xl font-bold text-white">{getLevelTitle(level)}</h3>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 justify-end mb-1">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-lg font-bold text-white">{xp.toLocaleString()} XP</span>
          </div>
          <p className="text-sm text-slate-400">{earnedBadges}/{totalBadges} conquistas</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Progresso para o próximo nível</span>
          <span className="text-slate-300">
            {Math.round(progress.current).toLocaleString()} / {progress.needed.toLocaleString()} XP
          </span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Level rewards preview */}
      <div className="mt-4 pt-4 border-t border-violet-500/20">
        <p className="text-sm text-slate-400 mb-2">Próximas recompensas:</p>
        <div className="flex gap-3">
          {getNextRewards(level).map((reward, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/50 px-3 py-1.5 rounded-lg"
            >
              <Star className="w-3 h-3 text-yellow-400" />
              {reward}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getLevelTitle(level: number): string {
  const titles = [
    'Iniciante',
    'Caminhante',
    'Atleta',
    'Corredor',
    'Maratonista',
    'Triatleta',
    'Campeão',
    'Lenda',
    'Mestre',
    'Imortal',
  ];
  return titles[Math.min(level - 1, titles.length - 1)] || 'Imortal';
}

function getNextRewards(level: number): string[] {
  if (level < 5) return ['+10% XP', 'Novo título'];
  if (level < 10) return ['+15% XP', 'Badge exclusiva'];
  return ['+20% XP', 'Título Lendário'];
}
