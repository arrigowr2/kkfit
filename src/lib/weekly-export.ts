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
    
    // Summary data - no emojis in PDF (Helvetica doesn't support Unicode)
    const summaryData = [
      { label: 'Passos Totais', value: summary.totalSteps.toLocaleString() },
      { label: 'Calorias Queimadas', value: summary.totalCalories.toLocaleString() },
      { label: 'FC Media', value: `${summary.avgHeartRate} bpm` },
      { label: 'Peso Medio', value: `${summary.avgWeight} kg` },
      { label: 'Horas de Sono', value: `${Math.round(summary.totalSleepHours)}h` },
    ];
    
    summaryData.forEach((item) => {
      page.drawText(`${item.label}: ${item.value}`, {
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

// Helper function to draw a bar chart
function drawBarChart(
  page: any,
  data: { label: string; value: number }[],
  title: string,
  startY: number,
  color: { r: number; g: number; b: number },
  maxValue?: number,
  helveticaFont: any = null,
  helveticaBold: any = null
) {
  if (!helveticaFont) helveticaFont = page._doc.catalog;
  if (!helveticaBold) helveticaBold = helveticaFont;
  
  const chartWidth = 450;
  const chartHeight = 100;
  const barWidth = (chartWidth - 40) / Math.max(data.length, 1) - 10;
  const padding = 20;
  
  const max = maxValue || Math.max(...data.map(d => d.value), 1);
  
  // Chart title
  page.drawText(title, {
    x: 50,
    y: startY,
    size: 12,
    font: helveticaBold,
    color: rgb(0.122, 0.161, 0.215),
  });
  
  const chartTop = startY - 15;
  const chartBottom = chartTop - chartHeight;
  
  // Draw bars
  data.forEach((item, i) => {
    const barHeight = (item.value / max) * chartHeight;
    const x = padding + 50 + i * (barWidth + 10);
    const y = chartBottom + barHeight;
    
    // Bar
    page.drawRectangle({
      x,
      y,
      width: barWidth,
      height: barHeight,
      color: rgb(color.r, color.g, color.b),
    });
    
    // Label (day)
    page.drawText(item.label, {
      x: x + barWidth / 2 - 5,
      y: chartBottom - 12,
      size: 7,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4),
    });
    
    // Value on top of bar
    if (barHeight > 15) {
      page.drawText(item.value.toLocaleString(), {
        x: x + barWidth / 2 - 10,
        y: y + 3,
        size: 7,
        font: helveticaFont,
        color: rgb(1, 1, 1),
      });
    }
  });
  
  return chartBottom - 30;
}

// Enhanced PDF generation with charts
export async function generatePDFWithCharts(
  data: any[],
  startDate: string,
  endDate: string,
  summary: any
): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.create();
    
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();
    
    let y = height - 60;
    
    // Title
    page.drawText('Relatorio Semanal de Fitness', {
      x: 50,
      y: y,
      size: 24,
      font: helveticaBold,
      color: rgb(0.145, 0.388, 0.922),
    });
    
    y -= 30;
    
    // Date range
    page.drawText(`Periodo: ${startDate} a ${endDate}`, {
      x: 50,
      y: y,
      size: 14,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4),
    });
    
    y -= 50;
    
    // Summary section
    page.drawText('Resumo da Semana', {
      x: 50,
      y: y,
      size: 18,
      font: helveticaBold,
      color: rgb(0.122, 0.161, 0.215),
    });
    
    y -= 30;
    
    const summaryData = [
      { label: 'Passos Totais', value: summary.totalSteps.toLocaleString() },
      { label: 'Calorias Queimadas', value: summary.totalCalories.toLocaleString() },
      { label: 'FC Media', value: `${summary.avgHeartRate} bpm` },
      { label: 'Peso Medio', value: `${summary.avgWeight} kg` },
      { label: 'Horas de Sono', value: `${Math.round(summary.totalSleepHours)}h` },
    ];
    
    summaryData.forEach((item) => {
      page.drawText(`${item.label}: ${item.value}`, {
        x: 70,
        y: y,
        size: 12,
        font: helveticaFont,
        color: rgb(0.216, 0.255, 0.318),
      });
      y -= 20;
    });
    
    y -= 30;
    
    // Charts section
    page.drawText('Graficos Comparativos', {
      x: 50,
      y: y,
      size: 18,
      font: helveticaBold,
      color: rgb(0.122, 0.161, 0.215),
    });
    
    y -= 30;
    
    // Prepare chart data
    const chartData = data.map((d: any) => {
      const date = new Date(d.date);
      const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()];
      return {
        label: dayName,
        date: d.date,
      };
    });
    
    // Steps chart (blue)
    const stepsChartData = chartData.map((d: any, i: number) => ({
      label: d.label,
      value: data[i]?.steps || 0,
    }));
    y = drawBarChart(page, stepsChartData, 'Passos Diarios', y, { r: 0.145, g: 0.388, b: 0.922 }, undefined, helveticaFont, helveticaBold);
    
    y -= 20;
    
    // Calories chart (orange)
    const caloriesChartData = chartData.map((d: any, i: number) => ({
      label: d.label,
      value: data[i]?.calories || 0,
    }));
    y = drawBarChart(page, caloriesChartData, 'Calorias Queimadas', y, { r: 0.945, g: 0.545, b: 0.08 }, undefined, helveticaFont, helveticaBold);
    
    // Check for new page
    if (y < 200) {
      page = pdfDoc.addPage([595, 842]);
      y = height - 60;
    }
    
    y -= 20;
    
    // Heart rate chart (red)
    const hrChartData = chartData.map((d: any, i: number) => ({
      label: d.label,
      value: data[i]?.heartRateAvg || 0,
    }));
    y = drawBarChart(page, hrChartData, 'Frequencia Cardiaca (bpm)', y, { r: 0.867, g: 0.2, b: 0.208 }, 120, helveticaFont, helveticaBold);
    
    y -= 20;
    
    // Sleep chart (purple)
    const sleepChartData = chartData.map((d: any, i: number) => ({
      label: d.label,
      value: (data[i]?.sleepHours || 0) * 60 + (data[i]?.sleepMinutes || 0), // Convert to minutes
    }));
    y = drawBarChart(page, sleepChartData, 'Sono (minutos)', y, { r: 0.545, g: 0.208, b: 0.867 }, undefined, helveticaFont, helveticaBold);
    
    y -= 20;
    
    // Weight chart (green) - only if we have weight data
    const hasWeight = data.some((d: any) => d.weight);
    if (hasWeight) {
      const weightChartData = chartData.map((d: any, i: number) => ({
        label: d.label,
        value: data[i]?.weight || 0,
      }));
      y = drawBarChart(page, weightChartData, 'Peso (kg)', y, { r: 0.173, g: 0.620, b: 0.478 }, 100, helveticaFont, helveticaBold);
    }
    
    // Daily data table
    if (y > 150) {
      y = Math.min(y, 150);
      
      page.drawText('Dados Diarios', {
        x: 50,
        y: y,
        size: 16,
        font: helveticaBold,
        color: rgb(0.122, 0.161, 0.215),
      });
      
      y -= 25;
      
      // Table headers
      const colWidths = [80, 70, 70, 70, 70, 60, 60];
      const headers = ['Data', 'Passos', 'Calorias', 'FC Media', 'FC Min', 'Peso', 'Sono'];
      let xPos = 50;
      
      headers.forEach((header, i) => {
        page.drawText(header, {
          x: xPos,
          y: y,
          size: 9,
          font: helveticaBold,
          color: rgb(0.42, 0.45, 0.5),
        });
        xPos += colWidths[i];
      });
      
      y -= 5;
      
      page.drawLine({
        start: { x: 50, y: y },
        end: { x: width - 50, y: y },
        thickness: 1,
        color: rgb(0.898, 0.906, 0.922),
      });
      
      y -= 15;
      
      // Table rows
      data.slice(0, 7).forEach((row: any) => {
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
          row.weight || '-',
          row.sleepHours ? `${row.sleepHours}h` : '-'
        ];
        
        rowData.forEach((cell, i) => {
          page.drawText(cell, {
            x: xPos,
            y: y,
            size: 8,
            font: helveticaFont,
            color: rgb(0.216, 0.255, 0.318),
          });
          xPos += colWidths[i];
        });
        
        y -= 15;
      });
    }
    
    // Footer
    const pages = pdfDoc.getPageCount();
    for (let i = 0; i < pages; i++) {
      const p = pdfDoc.getPage(i);
      p.drawText(`Pagina ${i + 1} de ${pages}`, {
        x: 250,
        y: 20,
        size: 10,
        font: helveticaFont,
        color: rgb(0.612, 0.639, 0.686),
      });
    }
    
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error("[WeeklyExport] Error generating PDF with charts:", error);
    throw error;
  }
}
