import { useQuery } from "@tanstack/react-query";

interface TodaySummary {
  steps: number;
  calories: number;
  activeMinutes: number;
  distance: number;
}

interface FitnessSummary {
  today: TodaySummary | null;
  steps: { date: string; steps: number }[];
  calories: { date: string; calories: number }[];
  heartRate: { date: string; avg: number; min: number; max: number }[];
  weight: { date: string; weight: number }[];
  sleep: { date: string; duration: number; quality: string }[];
}

interface ActivityData {
  date: string;
  steps: number;
  calories: number;
  distance: number;
  activeMinutes: number;
}

async function fetchWithRetry(url: string, options?: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      
      if (response.status === 401) throw new Error("Unauthorized");
      
      if (i === retries) {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    } catch (error) {
      if (i === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error("Max retries exceeded");
}

export function useFitnessSummary(mode: string, dates?: string[]) {
  return useQuery<FitnessSummary>({
    queryKey: ["fitness", "summary", mode, dates],
    queryFn: async () => {
      let url = `/api/fitness/summary?date=${mode}`;
      if (dates && dates.length > 0) {
        url += `&mode=multiple&dates=${dates.join(",")}`;
      }
      const response = await fetchWithRetry(url);
      return response.json();
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useActivityData(mode: string, dates?: string[]) {
  return useQuery<ActivityData[]>({
    queryKey: ["fitness", "activity", mode, dates],
    queryFn: async () => {
      let url = `/api/fitness/steps?date=${mode}`;
      if (dates && dates.length > 0) {
        url += `&mode=multiple&dates=${dates.join(",")}`;
      }
      const response = await fetchWithRetry(url);
      return response.json();
    },
    staleTime: 2 * 60 * 1000,
  });
}
