'use client';

import { useEffect, useState } from 'react';
import { EarnedBadge, getTierColor, getTierLabel } from '@/lib/gamification';
import { X, Award } from 'lucide-react';

interface BadgeNotificationProps {
  badge: EarnedBadge | null;
  onClose: () => void;
}

export function BadgeNotification({ badge, onClose }: BadgeNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (badge) {
      setIsVisible(true);
      setProgress(100);
      
      // Auto close after 5 seconds
      const duration = 5000;
      const interval = 50;
      const steps = duration / interval;
      const decrement = 100 / steps;
      
      const timer = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev - decrement;
          if (newProgress <= 0) {
            clearInterval(timer);
            setIsVisible(false);
            setTimeout(onClose, 300);
            return 0;
          }
          return newProgress;
        });
      }, interval);

      return () => clearInterval(timer);
    }
  }, [badge, onClose]);

  if (!badge || !isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div
        className={`relative bg-gradient-to-br ${getTierColor(badge.tier)} p-0.5 rounded-2xl shadow-2xl`}
      >
        <div className="bg-slate-900 rounded-2xl p-5 min-w-[320px]">
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800 rounded-b-2xl overflow-hidden">
            <div
              className="h-full bg-white/50 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Close button */}
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Content */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center text-3xl border border-slate-600">
              {badge.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-medium text-yellow-400 uppercase tracking-wide">
                  Nova Conquista!
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{badge.name}</h3>
              <p className="text-sm text-slate-400 mb-2">{badge.description}</p>
              <span
                className={`inline-block text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${getTierColor(
                  badge.tier
                )} text-white font-medium`}
              >
                {getTierLabel(badge.tier)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
