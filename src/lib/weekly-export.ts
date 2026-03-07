import { cookies } from "next/headers";
import { getStepsData, getCaloriesData, getHeartRateData, getWeightData, getSleepData, getActivityData } from "./google-fit";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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

export async function generatePDF(data: any[], startDate: string, endDate: string, summary: any): Promise<Buffer> {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Embed the standard Helvetica font (built into pdf-lib, no external files needed)
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Add a page
    let page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();
    
    let y = height - 60;
    
    // Title
    page.drawText('Relatório Semanal de Fitness', {
      x: 50,
      y: y,
      size: 24,
      font: helveticaBold,
      color: rgb(0.145, 0.388, 0.922), // #2563eb
    });
    
    y -= 30;
    
    // Date range
    page.drawText(`Período: ${startDate} a ${endDate}`, {
      x: 50,
      y: y,
      size: 14,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4), // #666
    });
    
    y -= 50;
    
    // Summary section title
    page.drawText('Resumo da Semana', {
      x: 50,
      y: y,
      size: 18,
      font: helveticaBold,
      color: rgb(0.122, 0.161, 0.215), // #1f2937
    });
    
    y -= 30;
    
    // Summary data
    const summaryData = [
      { label: 'Passos Totais', value: summary.totalSteps.toLocaleString(), icon: '🚶' },
      { label: 'Calorias Queimadas', value: summary.totalCalories.toLocaleString(), icon: '🔥' },
      { label: 'FC Média', value: `${summary.avgHeartRate} bpm`, icon: '❤️' },
      { label: 'Peso Médio', value: `${summary.avgWeight} kg`, icon: '⚖️' },
      { label: 'Horas de Sono', value: `${Math.round(summary.totalSleepHours)}h`, icon: '😴' },
    ];
    
    summaryData.forEach((item) => {
      page.drawText(`${item.icon} ${item.label}: ${item.value}`, {
        x: 70,
        y: y,
        size: 12,
        font: helveticaFont,
        color: rgb(0.216, 0.255, 0.318), // #374151
      });
      y -= 20;
    });
    
    y -= 30;
    
    // Daily data section
    page.drawText('Dados Diários', {
      x: 50,
      y: y,
      size: 18,
      font: helveticaBold,
      color: rgb(0.122, 0.161, 0.215),
    });
    
    y -= 30;
    
    // Table headers
    const colWidths = [80, 70, 70, 70, 70, 60, 60];
    const headers = ['Data', 'Passos', 'Calorias', 'FC Média', 'FC Mín', 'Peso', 'Sono'];
    let xPos = 50;
    
    headers.forEach((header, i) => {
      page.drawText(header, {
        x: xPos,
        y: y,
        size: 9,
        font: helveticaBold,
        color: rgb(0.42, 0.45, 0.5), // #6b7280
      });
      xPos += colWidths[i];
    });
    
    y -= 5;
    
    // Draw header line
    page.drawLine({
      start: { x: 50, y: y },
      end: { x: width - 50, y: y },
      thickness: 1,
      color: rgb(0.898, 0.906, 0.922), // #e5e7eb
    });
    
    y -= 15;
    
    // Table rows
    data.forEach((row) => {
      // Check if we need a new page
      if (y < 80) {
        page = pdfDoc.addPage([595, 842]);
        y = height - 60;
      }
      
      xPos = 50;
      const rowData = [
        row.date || '-',
        (row.steps || '-').toString(),
        (row.calories || '-').toString(),
        (row.heartRateAvg || '-').toString(),
        (row.heartRateMin || '-').toString(),
        (row.weight || '-').toString(),
        row.sleepHours ? `${row.sleepHours}h` : '-'
      ];
      
      rowData.forEach((cell, i) => {
        page.drawText(cell, {
          x: xPos,
          y: y,
          size: 8,
          font: helveticaFont,
          color: rgb(0.216, 0.255, 0.318), // #374151
        });
        xPos += colWidths[i];
      });
      
      y -= 15;
    });
    
    // Footer
    page.drawText('Gerado automaticamente pelo FitDashboard', {
      x: 50,
      y: 40,
      size: 10,
      font: helveticaFont,
      color: rgb(0.612, 0.639, 0.686), // #9ca3af
    });
    
    // Serialize the PDF to bytes
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error("[WeeklyExport] Error generating PDF:", error);
    throw error;
  }
}
