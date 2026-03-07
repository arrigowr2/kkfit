import { cookies } from "next/headers";
import { getStepsData, getCaloriesData, getHeartRateData, getWeightData, getSleepData, getActivityData } from "./google-fit";

const CREDENTIALS_COOKIE_NAME = "kkfit_credentials";

interface StoredCredentials {
  refreshToken: string;
  email: string;
  lastExport?: string;
}

// Store credentials in a secure HTTP-only cookie (persists across requests in Vercel)
export async function storeCredentials(refreshToken: string, email: string) {
  const credentials: StoredCredentials = { 
    refreshToken, 
    email, 
    lastExport: new Date().toISOString() 
  };
  
  const cookieStore = await cookies();
  cookieStore.set(CREDENTIALS_COOKIE_NAME, JSON.stringify(credentials), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
  
  console.log("[WeeklyExport] Credentials stored successfully in cookie");
}

export async function getStoredCredentials(): Promise<StoredCredentials | null> {
  try {
    const cookieStore = await cookies();
    const credentialsCookie = cookieStore.get(CREDENTIALS_COOKIE_NAME);
    
    if (!credentialsCookie?.value) {
      return null;
    }
    
    return JSON.parse(credentialsCookie.value) as StoredCredentials;
  } catch (error) {
    console.error("[WeeklyExport] Error reading credentials cookie:", error);
    return null;
  }
}

export async function getAccessTokenFromRefreshToken(refreshToken: string): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const refreshed = await response.json();

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${JSON.stringify(refreshed)}`);
  }

  return refreshed.access_token;
}

export async function generateWeeklyReport(accessToken: string) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];

  console.log(`[WeeklyExport] Generating report from ${startStr} to ${endStr}`);

  // Fetch all data for the past week
  const [steps, calories, heartRateRaw, weight, sleep, activity] = await Promise.all([
    getStepsData(accessToken, 7).catch(e => { console.error("Steps error:", e); return []; }),
    getCaloriesData(accessToken, 7).catch(e => { console.error("Calories error:", e); return []; }),
    getHeartRateData(accessToken, 7).catch(e => { console.error("HeartRate error:", e); return { data: [] }; }),
    getWeightData(accessToken, 7).catch(e => { console.error("Weight error:", e); return []; }),
    getSleepData(accessToken, 7).catch(e => { console.error("Sleep error:", e); return []; }),
    getActivityData(accessToken, 7).catch(e => { console.error("Activity error:", e); return []; }),
  ]);
  
  // Extract data from heartRate result (it now returns { data, debug })
  const heartRate = (heartRateRaw as any)?.data || heartRateRaw || [];

  // Convert to the format used by export.ts
  const dateMap = new Map<string, any>();

  // Helper to add data to map
  const addToMap = (data: any[], type: string, fields: Record<string, string>) => {
    data.forEach((item: any) => {
      const date = item.date;
      if (!dateMap.has(date)) {
        dateMap.set(date, { date });
      }
      const entry = dateMap.get(date)!;
      Object.entries(fields).forEach(([key, value]) => {
        if (item[value] !== undefined) {
          entry[key] = item[value];
        }
      });
    });
  };

  // Add steps
  addToMap(steps as any[], "steps", { steps: "steps" });
  
  // Add calories
  addToMap(calories as any[], "calories", { calories: "calories" });
  
  // Add heart rate
  addToMap(heartRate as any[], "heartRate", { 
    heartRateAvg: "avg", 
    heartRateMin: "min", 
    heartRateMax: "max" 
  });
  
  // Add weight
  addToMap(weight as any[], "weight", { weight: "weight" });
  
  // Add sleep
  addToMap(sleep as any[], "sleep", { 
    sleepHours: "hours", 
    sleepMinutes: "minutes" 
  });
  
  // Add activity
  addToMap(activity as any[], "activity", { 
    distance: "distance", 
    activeMinutes: "activeMinutes" 
  });

  const data = Array.from(dateMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return {
    data,
    startDate: startStr,
    endDate: endStr,
    summary: {
      totalSteps: steps.reduce((sum: number, d: any) => sum + (d.steps || 0), 0),
      totalCalories: calories.reduce((sum: number, d: any) => sum + (d.calories || 0), 0),
      avgHeartRate: heartRate.length > 0 
        ? Math.round(heartRate.reduce((sum: number, d: any) => sum + (d.avg || 0), 0) / heartRate.length)
        : 0,
      avgWeight: weight.length > 0
        ? Math.round((weight.reduce((sum: number, d: any) => sum + (d.weight || 0), 0) / weight.length) * 10) / 10
        : 0,
      totalSleepHours: sleep.reduce((sum: number, d: any) => sum + (d.duration || 0), 0) / 60,
    }
  };
}

export function generateCSV(data: any[]): string {
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

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}
