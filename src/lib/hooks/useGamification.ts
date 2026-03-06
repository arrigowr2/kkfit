'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  calculateStreak,
  checkBadges,
  StreakData,
  EarnedBadge,
  BADGES,
} from '@/lib/gamification';

interface DailyActivity {
  date: string;
  steps: number;
  calories?: number;
  sleep?: number;
}

interface GamificationState {
  streak: StreakData;
  earnedBadges: EarnedBadge[];
  allBadges: typeof BADGES;
  recentBadge: EarnedBadge | null;
  xp: number;
  level: number;
}

const STORAGE_KEY = 'kkfit_gamification';

// Calculate XP and level
function calculateXP(earnedBadges: EarnedBadge[], streak: StreakData): { xp: number; level: number } {
  // XP from badges
  const badgeXP = earnedBadges.reduce((sum, badge) => {
    const tierMultiplier = {
      bronze: 50,
      silver: 100,
      gold: 250,
      platinum: 500,
    };
    return sum + tierMultiplier[badge.tier];
  }, 0);

  // XP from streaks
  const streakXP = streak.currentStreak * 10;
  const longestStreakBonus = streak.longestStreak * 5;

  const totalXP = badgeXP + streakXP + longestStreakBonus;
  
  // Level calculation (exponential)
  const level = Math.floor(Math.sqrt(totalXP / 100)) + 1;

  return { xp: totalXP, level };
}

export function useGamification(activityData: DailyActivity[] | null) {
  const [state, setState] = useState<GamificationState>({
    streak: { currentStreak: 0, longestStreak: 0, lastActiveDate: null, streakDates: [] },
    earnedBadges: [],
    allBadges: BADGES,
    recentBadge: null,
    xp: 0,
    level: 1,
  });

  // Load saved state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setState((prev) => ({
            ...prev,
            earnedBadges: parsed.earnedBadges || [],
          }));
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, []);

  // Use ref to track previous activity data and prevent unnecessary recalculations
  const prevActivityDataRef = useRef<string>('');

  // Calculate gamification data when activity data changes
  useEffect(() => {
    if (!activityData || activityData.length === 0) return;

    // Create a string key from the activity data to detect changes
    const activityDataKey = activityData.map(d => `${d.date}:${d.steps}`).join(',');
    
    // Skip if the data hasn't changed
    if (prevActivityDataRef.current === activityDataKey) return;
    prevActivityDataRef.current = activityDataKey;

    // Wrap in try-catch to prevent any errors from breaking the app
    try {
      const streak = calculateStreak(activityData);
      const newBadges = checkBadges(activityData, streak.currentStreak);

      setState((prev) => {
        // Find newly earned badges
        const prevBadgeIds = new Set(prev.earnedBadges.map((b) => b.id));
        const newlyEarned = newBadges.filter((b) => !prevBadgeIds.has(b.id));
        
        // Show notification for most recent badge
        const recentBadge = newlyEarned.length > 0 ? newlyEarned[0] : null;

        // Merge old and new badges
        const mergedBadges = [...prev.earnedBadges];
        newBadges.forEach((badge) => {
          if (!prevBadgeIds.has(badge.id)) {
            mergedBadges.push(badge);
          }
        });

        const { xp, level } = calculateXP(mergedBadges, streak);

        return {
          ...prev,
          streak,
          earnedBadges: mergedBadges,
          recentBadge,
          xp,
          level,
        };
      });
    } catch (error) {
      console.error('[useGamification] Error calculating gamification data:', error);
    }
  }, [activityData]);

  // Save to localStorage when badges change
  useEffect(() => {
    if (typeof window !== 'undefined' && state.earnedBadges.length > 0) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ earnedBadges: state.earnedBadges })
      );
    }
  }, [state.earnedBadges]);

  // Clear recent badge notification
  const clearRecentBadge = useCallback(() => {
    setState((prev) => ({ ...prev, recentBadge: null }));
  }, []);

  // Get progress towards next level
  const levelProgress = useMemo(() => {
    const xpForCurrentLevel = Math.pow(state.level - 1, 2) * 100;
    const xpForNextLevel = Math.pow(state.level, 2) * 100;
    const currentLevelXP = state.xp - xpForCurrentLevel;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;
    const percentage = Math.min(100, (currentLevelXP / xpNeeded) * 100);
    
    return {
      current: currentLevelXP,
      needed: xpNeeded,
      percentage,
    };
  }, [state.xp, state.level]);

  return {
    ...state,
    clearRecentBadge,
    levelProgress,
    totalBadges: BADGES.length,
  };
}
