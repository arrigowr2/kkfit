import { differenceInDays, parseISO, format, isSameDay, subDays } from 'date-fns';

// Badge definitions
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'steps' | 'calories' | 'sleep' | 'weight' | 'streak' | 'special';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  requirement: number;
  requirementType: 'single_day' | 'cumulative' | 'streak';
}

export const BADGES: Badge[] = [
  // Steps badges
  { id: 'steps_5k', name: 'Caminhante', description: 'Alcance 5.000 passos em um dia', icon: '🚶', category: 'steps', tier: 'bronze', requirement: 5000, requirementType: 'single_day' },
  { id: 'steps_10k', name: 'Maratonista', description: 'Alcance 10.000 passos em um dia', icon: '🏃', category: 'steps', tier: 'silver', requirement: 10000, requirementType: 'single_day' },
  { id: 'steps_15k', name: 'Ultra Runner', description: 'Alcance 15.000 passos em um dia', icon: '🏆', category: 'steps', tier: 'gold', requirement: 15000, requirementType: 'single_day' },
  { id: 'steps_100k_total', name: 'Centenário', description: 'Acumule 100.000 passos no total', icon: '💯', category: 'steps', tier: 'bronze', requirement: 100000, requirementType: 'cumulative' },
  { id: 'steps_1m_total', name: 'Milionário', description: 'Acumule 1.000.000 de passos no total', icon: '👑', category: 'steps', tier: 'gold', requirement: 1000000, requirementType: 'cumulative' },
  
  // Calories badges
  { id: 'calories_300', name: 'Queimador', description: 'Queime 300 calorias em um dia', icon: '🔥', category: 'calories', tier: 'bronze', requirement: 300, requirementType: 'single_day' },
  { id: 'calories_500', name: 'Incinerador', description: 'Queime 500 calorias em um dia', icon: '🔥🔥', category: 'calories', tier: 'silver', requirement: 500, requirementType: 'single_day' },
  { id: 'calories_1000', name: 'Fornalha', description: 'Queime 1.000 calorias em um dia', icon: '🔥🔥🔥', category: 'calories', tier: 'gold', requirement: 1000, requirementType: 'single_day' },
  
  // Sleep badges
  { id: 'sleep_7h', name: 'Dorminhoco', description: 'Durma 7+ horas em uma noite', icon: '😴', category: 'sleep', tier: 'bronze', requirement: 7, requirementType: 'single_day' },
  { id: 'sleep_8h', name: 'Sono de Bebê', description: 'Durma 8+ horas em uma noite', icon: '👶', category: 'sleep', tier: 'silver', requirement: 8, requirementType: 'single_day' },
  { id: 'sleep_streak_7', name: 'Rotina de Sono', description: 'Durma 7+ horas por 7 dias seguidos', icon: '🌙', category: 'sleep', tier: 'gold', requirement: 7, requirementType: 'streak' },
  
  // Streak badges
  { id: 'streak_3', name: 'Consistente', description: '3 dias seguidos de atividade', icon: '🔥', category: 'streak', tier: 'bronze', requirement: 3, requirementType: 'streak' },
  { id: 'streak_7', name: 'Em Chamas', description: '7 dias seguidos de atividade', icon: '🔥🔥', category: 'streak', tier: 'silver', requirement: 7, requirementType: 'streak' },
  { id: 'streak_30', name: 'Lenda', description: '30 dias seguidos de atividade', icon: '🐉', category: 'streak', tier: 'gold', requirement: 30, requirementType: 'streak' },
  { id: 'streak_100', name: 'Imortal', description: '100 dias seguidos de atividade', icon: '👻', category: 'streak', tier: 'platinum', requirement: 100, requirementType: 'streak' },
  
  // Special badges
  { id: 'early_bird', name: 'Madrugador', description: 'Registre atividade antes das 6h', icon: '🐦', category: 'special', tier: 'bronze', requirement: 1, requirementType: 'single_day' },
  { id: 'night_owl', name: 'Coruja', description: 'Registre atividade após 22h', icon: '🦉', category: 'special', tier: 'bronze', requirement: 1, requirementType: 'single_day' },
  { id: 'weekend_warrior', name: 'Guerreiro de Fim de Semana', description: '10.000 passos em um sábado ou domingo', icon: '⚔️', category: 'special', tier: 'silver', requirement: 10000, requirementType: 'single_day' },
];

// Streak calculation
export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  streakDates: string[];
}

export function calculateStreak(
  dailyData: Array<{ date: string; steps: number; calories?: number }>,
  minSteps: number = 1000
): StreakData {
  if (!dailyData || dailyData.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastActiveDate: null, streakDates: [] };
  }

  // Sort by date ascending
  const sortedData = [...dailyData].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let lastActiveDate: string | null = null;
  const streakDates: string[] = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if active today
  const todayData = sortedData.find(d => isSameDay(parseISO(d.date), today));
  const isActiveToday = todayData && todayData.steps >= minSteps;

  // Calculate from yesterday backwards for current streak
  let checkDate = subDays(today, 1);
  let checkingCurrent = !isActiveToday; // If active today, we start counting from yesterday

  if (isActiveToday) {
    currentStreak = 1;
    streakDates.push(format(today, 'yyyy-MM-dd'));
    lastActiveDate = format(today, 'yyyy-MM-dd');
    checkDate = subDays(today, 1);
  }

  // Count consecutive days
  while (true) {
    const dateStr = format(checkDate, 'yyyy-MM-dd');
    const dayData = sortedData.find(d => d.date === dateStr);
    
    if (dayData && dayData.steps >= minSteps) {
      currentStreak++;
      streakDates.push(dateStr);
      lastActiveDate = dateStr;
      checkDate = subDays(checkDate, 1);
    } else {
      break;
    }
  }

  // Calculate longest streak
  tempStreak = 0;
  for (let i = 0; i < sortedData.length; i++) {
    const day = sortedData[i];
    if (day.steps >= minSteps) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    lastActiveDate,
    streakDates
  };
}

// Badge checking
export interface EarnedBadge extends Badge {
  earnedAt: string;
}

export function checkBadges(
  dailyData: Array<{ date: string; steps: number; calories?: number; sleep?: number }>,
  currentStreak: number
): EarnedBadge[] {
  const earnedBadges: EarnedBadge[] = [];
  const today = new Date();

  // Calculate totals
  const totalSteps = dailyData.reduce((sum, d) => sum + (d.steps || 0), 0);
  const maxStepsInDay = Math.max(...dailyData.map(d => d.steps || 0), 0);
  const maxCaloriesInDay = Math.max(...dailyData.map(d => d.calories || 0), 0);
  const maxSleepInDay = Math.max(...dailyData.map(d => d.sleep || 0), 0);

  // Check each badge
  BADGES.forEach(badge => {
    let earned = false;

    switch (badge.requirementType) {
      case 'single_day':
        if (badge.category === 'steps' && maxStepsInDay >= badge.requirement) earned = true;
        if (badge.category === 'calories' && maxCaloriesInDay >= badge.requirement) earned = true;
        if (badge.category === 'sleep' && maxSleepInDay >= badge.requirement) earned = true;
        break;
      
      case 'cumulative':
        if (badge.category === 'steps' && totalSteps >= badge.requirement) earned = true;
        break;
      
      case 'streak':
        if (badge.category === 'streak' && currentStreak >= badge.requirement) earned = true;
        if (badge.category === 'sleep' && currentStreak >= badge.requirement) earned = true;
        break;
    }

    if (earned) {
      earnedBadges.push({
        ...badge,
        earnedAt: format(today, 'yyyy-MM-dd')
      });
    }
  });

  return earnedBadges;
}

// Get tier color
export function getTierColor(tier: Badge['tier']): string {
  switch (tier) {
    case 'bronze': return 'from-amber-700 to-amber-600';
    case 'silver': return 'from-slate-400 to-slate-300';
    case 'gold': return 'from-yellow-500 to-amber-400';
    case 'platinum': return 'from-cyan-400 to-blue-300';
    default: return 'from-slate-500 to-slate-400';
  }
}

// Get tier label
export function getTierLabel(tier: Badge['tier']): string {
  switch (tier) {
    case 'bronze': return 'Bronze';
    case 'silver': return 'Prata';
    case 'gold': return 'Ouro';
    case 'platinum': return 'Platina';
    default: return tier;
  }
}