export interface PeriodComparison {
  currentPeriod: {
    totalSteps: number;
    totalCalories: number;
    avgHeartRate: number;
    totalSleep: number;
    avgWeight: number;
  };
  previousPeriod: {
    totalSteps: number;
    totalCalories: number;
    avgHeartRate: number;
    totalSleep: number;
    avgWeight: number;
  };
  changes: {
    stepsChange: number;
    caloriesChange: number;
    heartRateChange: number;
    sleepChange: number;
    weightChange: number;
  };
}

export function comparePeriods(
  currentData: {
    steps: { steps: number }[];
    calories: { calories: number }[];
    heartRate: { avg: number }[];
    sleep: { duration: number }[];
    weight: { weight: number }[];
  },
  previousData: {
    steps: { steps: number }[];
    calories: { calories: number }[];
    heartRate: { avg: number }[];
    sleep: { duration: number }[];
    weight: { weight: number }[];
  }
): PeriodComparison {
  const currentPeriod = {
    totalSteps: currentData.steps.reduce((sum, d) => sum + d.steps, 0),
    totalCalories: currentData.calories.reduce((sum, d) => sum + d.calories, 0),
    avgHeartRate: currentData.heartRate.length > 0
      ? Math.round(currentData.heartRate.reduce((sum, d) => sum + d.avg, 0) / currentData.heartRate.length)
      : 0,
    totalSleep: currentData.sleep.reduce((sum, d) => sum + d.duration, 0),
    avgWeight: currentData.weight.length > 0
      ? Math.round((currentData.weight.reduce((sum, d) => sum + d.weight, 0) / currentData.weight.length) * 10) / 10
      : 0,
  };

  const previousPeriod = {
    totalSteps: previousData.steps.reduce((sum, d) => sum + d.steps, 0),
    totalCalories: previousData.calories.reduce((sum, d) => sum + d.calories, 0),
    avgHeartRate: previousData.heartRate.length > 0
      ? Math.round(previousData.heartRate.reduce((sum, d) => sum + d.avg, 0) / previousData.heartRate.length)
      : 0,
    totalSleep: previousData.sleep.reduce((sum, d) => sum + d.duration, 0),
    avgWeight: previousData.weight.length > 0
      ? Math.round((previousData.weight.reduce((sum, d) => sum + d.weight, 0) / previousData.weight.length) * 10) / 10
      : 0,
  };

  const changes = {
    stepsChange: calculatePercentageChange(currentPeriod.totalSteps, previousPeriod.totalSteps),
    caloriesChange: calculatePercentageChange(currentPeriod.totalCalories, previousPeriod.totalCalories),
    heartRateChange: calculatePercentageChange(currentPeriod.avgHeartRate, previousPeriod.avgHeartRate),
    sleepChange: calculatePercentageChange(currentPeriod.totalSleep, previousPeriod.totalSleep),
    weightChange: calculatePercentageChange(currentPeriod.avgWeight, previousPeriod.avgWeight),
  };

  return { currentPeriod, previousPeriod, changes };
}

function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function getChangeColor(change: number, inverse = false): string {
  const isPositive = inverse ? change < 0 : change > 0;
  const isNegative = inverse ? change > 0 : change < 0;
  
  if (change === 0) return "text-slate-400";
  if (isPositive) return "text-green-400";
  if (isNegative) return "text-red-400";
  return "text-slate-400";
}

export function getChangeArrow(change: number): string {
  if (change > 0) return "↑";
  if (change < 0) return "↓";
  return "→";
}

export function formatChange(change: number): string {
  const sign = change > 0 ? "+" : "";
  return `${sign}${change}%`;
}
