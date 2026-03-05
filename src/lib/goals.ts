export interface UserGoals {
  dailySteps: number;
  dailyCalories: number;
  weeklyActiveMinutes: number;
  sleepHours: number;
}

export const DEFAULT_GOALS: UserGoals = {
  dailySteps: 10000,
  dailyCalories: 2500,
  weeklyActiveMinutes: 150,
  sleepHours: 8,
};

export function getGoals(): UserGoals {
  if (typeof window === "undefined") return DEFAULT_GOALS;
  
  const stored = localStorage.getItem("fitdashboard_goals");
  if (!stored) return DEFAULT_GOALS;
  
  try {
    return { ...DEFAULT_GOALS, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_GOALS;
  }
}

export function saveGoals(goals: Partial<UserGoals>): void {
  if (typeof window === "undefined") return;
  
  const current = getGoals();
  const updated = { ...current, ...goals };
  localStorage.setItem("fitdashboard_goals", JSON.stringify(updated));
}

export function calculateProgress(current: number, goal: number): number {
  return Math.min(100, Math.round((current / goal) * 100));
}

export function getProgressColor(percentage: number): string {
  if (percentage >= 100) return "bg-green-500";
  if (percentage >= 75) return "bg-emerald-500";
  if (percentage >= 50) return "bg-yellow-500";
  if (percentage >= 25) return "bg-orange-500";
  return "bg-red-500";
}

export function getProgressText(percentage: number): string {
  if (percentage >= 100) return "Meta atingida! 🎉";
  if (percentage >= 75) return "Quase lá! 💪";
  if (percentage >= 50) return "Bom progresso! 👍";
  if (percentage >= 25) return "Continue assim! 🚀";
  return "Vamos começar! 🏃";
}

export interface GoalAchievement {
  type: "steps" | "calories" | "activeMinutes" | "sleep";
  value: number;
  goal: number;
  date: string;
}

export function checkGoalAchievements(
  data: {
    steps?: number;
    calories?: number;
    activeMinutes?: number;
    sleepHours?: number;
  },
  goals: UserGoals,
  date: string
): GoalAchievement[] {
  const achievements: GoalAchievement[] = [];

  if (data.steps && data.steps >= goals.dailySteps) {
    achievements.push({
      type: "steps",
      value: data.steps,
      goal: goals.dailySteps,
      date,
    });
  }

  if (data.calories && data.calories >= goals.dailyCalories) {
    achievements.push({
      type: "calories",
      value: data.calories,
      goal: goals.dailyCalories,
      date,
    });
  }

  if (data.activeMinutes && data.activeMinutes >= goals.weeklyActiveMinutes / 7) {
    achievements.push({
      type: "activeMinutes",
      value: data.activeMinutes,
      goal: Math.round(goals.weeklyActiveMinutes / 7),
      date,
    });
  }

  if (data.sleepHours && data.sleepHours >= goals.sleepHours) {
    achievements.push({
      type: "sleep",
      value: data.sleepHours,
      goal: goals.sleepHours,
      date,
    });
  }

  return achievements;
}
