interface FitnessData {
  date: string;
  steps?: number;
  calories?: number;
  heartRateAvg?: number;
  heartRateMin?: number;
  heartRateMax?: number;
  weight?: number;
  sleepHours?: number;
  sleepMinutes?: number;
  distance?: number;
  activeMinutes?: number;
}

export function exportToCSV(data: FitnessData[], filename: string) {
  if (data.length === 0) {
    alert("Nenhum dado para exportar");
    return;
  }

  const headers = [
    "Data",
    "Passos",
    "Calorias",
    "FC Média",
    "FC Mín",
    "FC Máx",
    "Peso (kg)",
    "Sono (h)",
    "Sono (min)",
    "Distância (m)",
    "Min Ativos",
  ];

  const rows = data.map((row) => [
    row.date,
    row.steps ?? "",
    row.calories ?? "",
    row.heartRateAvg ?? "",
    row.heartRateMin ?? "",
    row.heartRateMax ?? "",
    row.weight ?? "",
    row.sleepHours ?? "",
    row.sleepMinutes ?? "",
    row.distance ?? "",
    row.activeMinutes ?? "",
  ]);

  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToJSON(data: FitnessData[], filename: string) {
  if (data.length === 0) {
    alert("Nenhum dado para exportar");
    return;
  }

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function generateFitnessDataset(
  steps: { date: string; value: number }[],
  calories: { date: string; value: number }[],
  heartRate: { date: string; avg: number; min: number; max: number }[],
  weight: { date: string; value: number }[],
  sleep: { date: string; hours: number; minutes: number }[],
  activity: { date: string; steps: number; calories: number; distance: number; activeMinutes: number }[]
): FitnessData[] {
  const dateMap = new Map<string, FitnessData>();

  steps.forEach((item) => {
    if (!dateMap.has(item.date)) {
      dateMap.set(item.date, { date: item.date });
    }
    dateMap.get(item.date)!.steps = item.value;
  });

  calories.forEach((item) => {
    if (!dateMap.has(item.date)) {
      dateMap.set(item.date, { date: item.date });
    }
    dateMap.get(item.date)!.calories = item.value;
  });

  heartRate.forEach((item) => {
    if (!dateMap.has(item.date)) {
      dateMap.set(item.date, { date: item.date });
    }
    const entry = dateMap.get(item.date)!;
    entry.heartRateAvg = item.avg;
    entry.heartRateMin = item.min;
    entry.heartRateMax = item.max;
  });

  weight.forEach((item) => {
    if (!dateMap.has(item.date)) {
      dateMap.set(item.date, { date: item.date });
    }
    dateMap.get(item.date)!.weight = item.value;
  });

  sleep.forEach((item) => {
    if (!dateMap.has(item.date)) {
      dateMap.set(item.date, { date: item.date });
    }
    const entry = dateMap.get(item.date)!;
    entry.sleepHours = item.hours;
    entry.sleepMinutes = item.minutes;
  });

  activity.forEach((item) => {
    if (!dateMap.has(item.date)) {
      dateMap.set(item.date, { date: item.date });
    }
    const entry = dateMap.get(item.date)!;
    entry.distance = item.distance;
    entry.activeMinutes = item.activeMinutes;
  });

  return Array.from(dateMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}
