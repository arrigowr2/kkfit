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
  // Note: weight is fetched for 30 days since it's not recorded daily
  const [steps, calories, heartRateRaw, weight, sleep, activity] = await Promise.all([
    getStepsData(accessToken, 7).catch(e => { console.error("Steps error:", e); return []; }),
    getCaloriesData(accessToken, 7).catch(e => { console.error("Calories error:", e); return []; }),
    getHeartRateData(accessToken, 7).catch(e => { console.error("HeartRate error:", e); return { data: [] }; }),
    getWeightData(accessToken, 30).catch(e => { console.error("Weight error:", e); return []; }),
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
  
  // Add sleep - duration is in minutes, convert to hours and minutes
  sleep.forEach((item: any) => {
    const date = item.date;
    if (!dateMap.has(date)) {
      dateMap.set(date, { date });
    }
    const entry = dateMap.get(date)!;
    const duration = item.duration || 0;
    entry.sleepHours = Math.floor(duration / 60);
    entry.sleepMinutes = duration % 60;
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
  const CHART_HEIGHT = 60; // Reduced height for single-page fit
  const BAR_MAX_WIDTH = 45;
  const PADDING_LEFT = 50;
  const PADDING_RIGHT = 50;
  const SPACING_BETWEEN_BARS = 8;
  
  // Ensure we have valid data
  if (!data || data.length === 0) {
    return startY - 40;
  }
  
  // Calculate bar dimensions
  const availableWidth = 595 - PADDING_LEFT - PADDING_RIGHT;
  const barWidth = Math.min(BAR_MAX_WIDTH, (availableWidth - (data.length - 1) * SPACING_BETWEEN_BARS) / data.length);
  const totalBarsWidth = barWidth * data.length + (data.length - 1) * SPACING_BETWEEN_BARS;
  const startX = PADDING_LEFT + (availableWidth - totalBarsWidth) / 2;
  
  const max = maxValue || Math.max(...data.map(d => d.value), 1);
  
  // Draw title
  page.drawText(title, {
    x: PADDING_LEFT,
    y: startY,
    size: 11,
    font: helveticaBold,
    color: rgb(0.122, 0.161, 0.215),
  });
  
  const chartBaseY = startY - 10;
  const chartTopY = chartBaseY - CHART_HEIGHT;
  
  // Draw each bar
  data.forEach((item, i) => {
    const barHeight = Math.max(2, (item.value / max) * CHART_HEIGHT);
    const x = startX + i * (barWidth + SPACING_BETWEEN_BARS);
    const y = chartTopY;
    
    // Bar rectangle
    page.drawRectangle({
      x,
      y,
      width: barWidth,
      height: barHeight,
      color: rgb(color.r, color.g, color.b),
    });
    
    // Day label below bar
    page.drawText(item.label, {
      x: x + barWidth / 2 - 8,
      y: chartTopY - 12,
      size: 7,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4),
    });
    
    // Value on top of bar (if bar is tall enough)
    if (barHeight > 12) {
      const valueText = item.value >= 1000 
        ? (item.value / 1000).toFixed(1) + 'k' 
        : item.value.toString();
      page.drawText(valueText, {
        x: x + barWidth / 2 - 6,
        y: y + barHeight + 2,
        size: 6,
        font: helveticaFont,
        color: rgb(0.2, 0.2, 0.2),
      });
    }
  });
  
  // Return the Y position after this chart
  return chartTopY - 25;
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
    
    let y = height - 50;
    const PAGE_MARGIN = 40;
    const MIN_Y_FOR_CHART = 120; // Minimum Y position to draw a chart
    const MIN_Y_FOR_TABLE = 100;  // Minimum Y position for table
    
    // Helper to check and add new page if needed
    const ensureSpace = (requiredSpace: number): void => {
      if (y < requiredSpace) {
        page = pdfDoc.addPage([595, 842]);
        y = height - PAGE_MARGIN;
      }
    };
    
    // Title
    page.drawText('Relatorio Semanal de Fitness', {
      x: PAGE_MARGIN,
      y: y,
      size: 22,
      font: helveticaBold,
      color: rgb(0.145, 0.388, 0.922),
    });
    
    y -= 25;
    
    // Date range
    page.drawText(`Periodo: ${startDate} a ${endDate}`, {
      x: PAGE_MARGIN,
      y: y,
      size: 12,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4),
    });
    
    y -= 35;
    
    // Prepare last 7 days data (used in both table and charts)
    const last7Days = data.slice(-7);
    
    // === Two-column layout: Resumo da Semana (left) + Dados Diarios (right) ===
    const leftColX = PAGE_MARGIN;
    const rightColX = 275; // Start of right column for table
    
    // Left column: Resumo da Semana
    page.drawText('Resumo da Semana', {
      x: leftColX,
      y: y,
      size: 14,
      font: helveticaBold,
      color: rgb(0.122, 0.161, 0.215),
    });
    
    y -= 18;
    
    const summaryData = [
      { label: 'Passos Totais', value: summary.totalSteps.toLocaleString() },
      { label: 'Calorias Queimadas', value: summary.totalCalories.toLocaleString() },
      { label: 'FC Media', value: `${summary.avgHeartRate} bpm` },
      { label: 'Peso Medio', value: `${summary.avgWeight} kg` },
      { label: 'Horas de Sono', value: `${Math.round(summary.totalSleepHours)}h` },
    ];
    
    summaryData.forEach((item) => {
      page.drawText(`${item.label}: ${item.value}`, {
        x: leftColX + 10,
        y: y,
        size: 10,
        font: helveticaFont,
        color: rgb(0.216, 0.255, 0.318),
      });
      y -= 14;
    });
    
    // Right column: Dados Diarios table (at same Y level as summary title)
    const tableStartY = y + 18 + 14; // Go back up to start table at same level as summary title
    
    page.drawText('Dados Diarios', {
      x: rightColX,
      y: tableStartY,
      size: 14,
      font: helveticaBold,
      color: rgb(0.122, 0.161, 0.215),
    });
    
    let tableY = tableStartY - 18;
    
    // Table headers - more compact
    const tableColWidths = [55, 50, 50, 45, 40, 40, 40];
    const tableHeaders = ['Data', 'Passos', 'Cal', 'FC Med', 'FC Min', 'Peso', 'Sono'];
    let tableX = rightColX;
    
    tableHeaders.forEach((header, i) => {
      page.drawText(header, {
        x: tableX,
        y: tableY,
        size: 8,
        font: helveticaBold,
        color: rgb(0.42, 0.45, 0.5),
      });
      tableX += tableColWidths[i];
    });
    
    tableY -= 3;
    
    page.drawLine({
      start: { x: rightColX, y: tableY },
      end: { x: rightColX + tableColWidths.reduce((a, b) => a + b, 0), y: tableY },
      thickness: 0.5,
      color: rgb(0.898, 0.906, 0.922),
    });
    
    tableY -= 10;
    
    // Table rows - only last 7 days, compact
    last7Days.forEach((row: any) => {
      tableX = rightColX;
      const rowData = [
        row.date ? row.date.slice(5) : '-', // Just MM-DD
        (row.steps || '-').toString(),
        (row.calories || '-').toString(),
        (row.heartRateAvg || '-').toString(),
        (row.heartRateMin || '-').toString(),
        row.weight ? row.weight.toString() : '-',
        row.sleepHours ? `${row.sleepHours}h` : '-'
      ];
      
      rowData.forEach((cell, i) => {
        page.drawText(cell, {
          x: tableX,
          y: tableY,
          size: 7,
          font: helveticaFont,
          color: rgb(0.216, 0.255, 0.318),
        });
        tableX += tableColWidths[i];
      });
      
      tableY -= 12;
    });
    
    // Use the lower of the two positions (summary end or table end)
    y = Math.min(y, tableY);
    
    y -= 20;
    
    // Charts section title
    ensureSpace(70);
    page.drawText('Graficos (Semana)', {
      x: PAGE_MARGIN,
      y: y,
      size: 14,
      font: helveticaBold,
      color: rgb(0.122, 0.161, 0.215),
    });
    
    y -= 15;
    
    // Debug: log data availability
    console.log('[WeeklyExport] Data for charts:', {
      dataCount: data.length,
      last7DaysCount: last7Days.length,
      hasSleep: last7Days.some((d: any) => d.sleepHours),
      hasWeight: last7Days.some((d: any) => d.weight),
      last7DaysSample: last7Days.slice(0, 2)
    });
    
    const chartLabels = last7Days.map((d: any) => {
      const date = new Date(d.date);
      return ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()];
    });
    
    // Helper to create chart data
    const createChartData = (field: string, converter?: (v: number) => number) => {
      return chartLabels.map((label: string, i: number) => ({
        label,
        value: converter ? converter(last7Days[i]?.[field] || 0) : (last7Days[i]?.[field] || 0)
      }));
    };
    
    // Steps chart (blue)
    ensureSpace(MIN_Y_FOR_CHART);
    const stepsChartData = createChartData('steps');
    y = drawBarChart(page, stepsChartData, 'Passos Diarios', y, { r: 0.145, g: 0.388, b: 0.922 }, undefined, helveticaFont, helveticaBold);
    
    y -= 10;
    
    // Calories chart (orange)
    ensureSpace(MIN_Y_FOR_CHART);
    const caloriesChartData = createChartData('calories');
    y = drawBarChart(page, caloriesChartData, 'Calorias Queimadas', y, { r: 0.945, g: 0.545, b: 0.08 }, undefined, helveticaFont, helveticaBold);
    
    y -= 10;
    
    // Heart rate chart (red)
    ensureSpace(MIN_Y_FOR_CHART);
    const hrChartData = createChartData('heartRateAvg');
    y = drawBarChart(page, hrChartData, 'Frequencia Cardiaca (bpm)', y, { r: 0.867, g: 0.2, b: 0.208 }, 120, helveticaFont, helveticaBold);
    
    y -= 10;
    
    // Sleep chart (purple)
    ensureSpace(MIN_Y_FOR_CHART);
    const hasSleep = last7Days.some((d: any) => d.sleepHours || d.sleepMinutes);
    if (hasSleep) {
      const sleepData = chartLabels.map((label, i) => ({
        label,
        value: ((last7Days[i]?.sleepHours || 0) * 60 + (last7Days[i]?.sleepMinutes || 0))
      }));
      y = drawBarChart(page, sleepData, 'Sono (minutos)', y, { r: 0.545, g: 0.208, b: 0.867 }, 600, helveticaFont, helveticaBold);
    } else {
      page.drawText('Sono: Sem dados disponiveis', {
        x: PAGE_MARGIN,
        y: y,
        size: 10,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
    
    y -= 10;
    
    // Weight chart (green) - show even if no data, with message
    ensureSpace(MIN_Y_FOR_CHART);
    const hasWeight = last7Days.some((d: any) => d.weight);
    if (hasWeight) {
      const weightData = createChartData('weight');
      y = drawBarChart(page, weightData, 'Peso (kg)', y, { r: 0.173, g: 0.620, b: 0.478 }, 120, helveticaFont, helveticaBold);
    } else {
      page.drawText('Peso: Sem dados disponiveis', {
        x: PAGE_MARGIN,
        y: y,
        size: 10,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
    
    // Footer on all pages
    const pages = pdfDoc.getPageCount();
    for (let i = 0; i < pages; i++) {
      const p = pdfDoc.getPage(i);
      p.drawText(`Pagina ${i + 1} de ${pages} - FitDashboard`, {
        x: PAGE_MARGIN,
        y: 20,
        size: 9,
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
