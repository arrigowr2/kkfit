'use client';

import { Badge, EarnedBadge, getTierColor, getTierLabel } from '@/lib/gamification';
import { Lock, Check } from 'lucide-react';

interface BadgesDisplayProps {
  allBadges: Badge[];
  earnedBadges: EarnedBadge[];
}

export function BadgesDisplay({ allBadges, earnedBadges }: BadgesDisplayProps) {
  const earnedIds = new Set(earnedBadges.map((b) => b.id));
  
  // Group badges by category
  const categories = {
    steps: 'Passos',
    calories: 'Calorias',
    sleep: 'Sono',
    streak: 'Sequência',
    weight: 'Peso',
    special: 'Especial',
  };

  return (
    <div className="space-y-6">
      {Object.entries(categories).map(([category, label]) => {
        const categoryBadges = allBadges.filter((b) => b.category === category);
        if (categoryBadges.length === 0) return null;

        return (
          <div key={category}>
            <h3 className="text-lg font-semibold text-white mb-3">{label}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {categoryBadges.map((badge) => {
                const isEarned = earnedIds.has(badge.id);
                return (
                  <BadgeCard key={badge.id} badge={badge} isEarned={isEarned} />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BadgeCard({ badge, isEarned }: { badge: Badge; isEarned: boolean }) {
  return (
    <div
      className={`relative group rounded-xl p-4 border transition-all duration-300 ${
        isEarned
          ? `bg-gradient-to-br ${getTierColor(badge.tier)} bg-opacity-20 border-white/20 shadow-lg`
          : 'bg-slate-800/50 border-slate-700 opacity-60'
      }`}
    >
      {/* Status icon */}
      <div className="absolute top-2 right-2">
        {isEarned ? (
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Check className="w-3 h-3 text-emerald-400" />
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center">
            <Lock className="w-3 h-3 text-slate-500" />
          </div>
        )}
      </div>

      {/* Badge content */}
      <div className="text-center">
        <div className="text-4xl mb-2">{badge.icon}</div>
        <h4 className="text-sm font-semibold text-white mb-1">{badge.name}</h4>
        <p className="text-xs text-slate-400 mb-2 line-clamp-2">{badge.description}</p>
        <span
          className={`inline-block text-xs px-2 py-0.5 rounded-full ${
            isEarned
              ? 'bg-white/20 text-white'
              : 'bg-slate-700 text-slate-400'
          }`}
        >
          {getTierLabel(badge.tier)}
        </span>
      </div>

      {/* Hover tooltip */}
      <div className="absolute inset-0 bg-slate-900/95 rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center text-center pointer-events-none">
        <p className="text-xs text-slate-300">{badge.description}</p>
        <p className="text-xs text-slate-500 mt-2">
          Requisito: {badge.requirement.toLocaleString()}{' '}
          {badge.category === 'steps'
            ? 'passos'
            : badge.category === 'calories'
            ? 'cal'
            : badge.category === 'sleep'
            ? 'horas'
            : 'dias'}
        </p>
      </div>
    </div>
  );
}
