import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTodaySummary,
  getStepsData,
  getCaloriesData,
  getHeartRateData,
  getSleepData,
  getWeightData,
  getActivityData,
  getDailyData,
} from "@/lib/google-fit";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date"); // YYYY-MM-DD format, or null for today, "total" for all data
  const mode = searchParams.get("mode"); // "multiple" for multiple dates
  const datesParam = searchParams.get("dates"); // comma-separated dates for multiple mode
  const days = parseInt(searchParams.get("days") || "30");
  
  // Debug logging
  console.log("[API Summary] Request URL:", request.url);
  console.log("[API Summary] dateParam:", dateParam, "mode:", mode, "datesParam:", datesParam);

  // Check if requesting multiple dates (either in dateParam or datesParam)
  const isMultiple = mode === "multiple" && 
    ((dateParam && dateParam.includes(",")) || (datesParam && datesParam.includes(",")));

  // Check if requesting all data (Total)
  const isTotal = dateParam === "total" || dateParam === "" || dateParam === null || dateParam === undefined;

  // Check if requesting today
  const isToday = dateParam === "today";

  // Determine the target date
  let targetDate: Date;
  let dateStr: string;

  if (isTotal) {
    // Total - get all data, no specific date
    targetDate = new Date();
    dateStr = "";
  } else if (isToday) {
    // Today - use today's date in local time
    targetDate = new Date();
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    dateStr = `${year}-${month}-${day}`;
  } else if (dateParam === "yesterday") {
    // Yesterday - use yesterday's date in local time
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    targetDate = yesterday;
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    dateStr = `${year}-${month}-${day}`;
  } else if (dateParam && dateParam !== "yesterday" && !dateParam.includes(",")) {
    // Single custom date - parse manually to avoid UTC issues
    const [year, month, day] = dateParam.split('-').map(Number);
    targetDate = new Date(year, month - 1, day); // month is 0-indexed
    dateStr = dateParam;
  } else if (isMultiple) {
    // Multiple dates - will be handled later
    targetDate = new Date();
    dateStr = dateParam || "";
  } else {
    targetDate = new Date();
    dateStr = targetDate.toISOString().split("T")[0];
  }

  if (isNaN(targetDate.getTime())) {
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 });
  }

  try {
    let todayData;
    let stepsData, caloriesData, heartRateData, sleepData, weightData, activityData;

    // Wrap each data fetch in try-catch to prevent one failure from crashing the entire request
    const safeGetData = async <T>(fn: () => Promise<T>, name: string): Promise<T> => {
      try {
        const result = await fn();
        return result;
      } catch (err: any) {
        console.error(`[API Summary] Error in ${name}:`, err.message);
        // Return appropriate default based on expected type
        return null as any;
      }
    };

    if (isTotal) {
      // Get all data (Total) - no specific date, get maximum historical data
      // For Total, calculate sum from all historical data
      [stepsData, caloriesData, heartRateData, sleepData, weightData, activityData] =
        await Promise.all([
          safeGetData(() => getStepsData(session.accessToken!, 90), "getStepsData"),
          safeGetData(() => getCaloriesData(session.accessToken!, 90), "getCaloriesData"),
          safeGetData(() => getHeartRateData(session.accessToken!, 90), "getHeartRateData"),
          safeGetData(() => getSleepData(session.accessToken!, 90), "getSleepData"),
          safeGetData(() => getWeightData(session.accessToken!, 90), "getWeightData"),
          safeGetData(() => getActivityData(session.accessToken!, 90), "getActivityData"),
        ]);
      
      console.log("[API Summary] Total mode - Raw data counts:", {
        steps: stepsData?.length,
        calories: caloriesData?.length,
        heartRate: ((heartRateData as any)?.data?.length || (heartRateData as any)?.length || 0),
        sleep: sleepData?.length,
        weight: weightData?.length,
        activity: activityData?.length,
        sleepSample: sleepData?.slice(0, 2)
      });
      
      // Calculate sum from all data for "total" display
      const sumSteps = (stepsData || []).reduce((sum, d) => sum + d.steps, 0);
      const sumCalories = (caloriesData || []).reduce((sum, d) => sum + d.calories, 0);
      const sumActivity = (activityData || []).reduce((sum, d) => sum + d.activeMinutes, 0);
      const sumDistance = (activityData || []).reduce((sum, d) => sum + d.distance, 0);
      
      todayData = {
        steps: sumSteps,
        calories: sumCalories,
        activeMinutes: sumActivity,
        distance: sumDistance
      };
    } else if (isToday) {
      // Get today's data and last 30 days for charts - but filter to only today for display
      // Use local date on the server (not UTC) to match client expectations
      const todayLocal = new Date();
      const todayStr = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`;
      
      console.log("[API Summary] Today mode - todayStr:", todayStr, "Server timezone offset:", todayLocal.getTimezoneOffset());
      
      [todayData, stepsData, caloriesData, heartRateData, sleepData, weightData, activityData] =
        await Promise.all([
          safeGetData(() => getTodaySummary(session.accessToken!), "getTodaySummary"),
          safeGetData(() => getStepsData(session.accessToken!, 30), "getStepsData"),
          safeGetData(() => getCaloriesData(session.accessToken!, 30), "getCaloriesData"),
          safeGetData(() => getHeartRateData(session.accessToken!, 30), "getHeartRateData"),
          safeGetData(() => getSleepData(session.accessToken!, 30), "getSleepData"),
          safeGetData(() => getWeightData(session.accessToken!, 90), "getWeightData"),
          safeGetData(() => getActivityData(session.accessToken!, 30), "getActivityData"),
        ]);
      
      console.log("[API Summary] Today mode - Raw steps data count:", stepsData?.length || 0);
      console.log("[API Summary] Today mode - Sample steps dates:", stepsData?.slice(0, 3).map(d => d.date));
      console.log("[API Summary] Today mode - todayData from API:", todayData);
      
      // Filter data to only show today (for client-side display consistency)
      const hrResult = heartRateData as { data?: any[] };
      const hrData = hrResult?.data || heartRateData;
      stepsData = (stepsData || []).filter(d => d.date === todayStr);
      caloriesData = (caloriesData || []).filter(d => d.date === todayStr);
      activityData = (activityData || []).filter(d => d.date === todayStr);
      heartRateData = ((hrData as any) || []).filter((d: any) => d.date === todayStr);
      sleepData = (sleepData || []).filter(d => d.date === todayStr);
      
      console.log("[API Summary] Today mode - Filtered steps data count:", stepsData.length);
    } else if (isMultiple) {
      // Multiple dates - comma-separated (use datesParam if available, fallback to dateParam)
      const datesSource = datesParam || dateParam || "";
      const dateList = datesSource.split(",").map(d => d.trim()).filter(d => d.length > 0);
      
      console.log("[API Summary] Multiple mode - datesSource:", datesSource);
      console.log("[API Summary] Multiple mode - dateList:", dateList);
      
      // Sort dates and calculate the range properly
      const sortedDates = [...dateList].sort();
      const firstDate = sortedDates[0];
      const lastDate = sortedDates[sortedDates.length - 1];
      // Parse dates manually to avoid UTC issues
      const [firstYear, firstMonth, firstDay] = firstDate.split('-').map(Number);
      const [lastYear, lastMonth, lastDay] = lastDate.split('-').map(Number);
      const first = new Date(firstYear, firstMonth - 1, firstDay);
      const last = new Date(lastYear, lastMonth - 1, lastDay);
      // Calculate actual number of days in the range
      const daysDiff = (last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24);
      const numDays = Math.round(daysDiff) + 1;
      
      // Get data for the date range - use lastDate to calculate range correctly
      [todayData, stepsData, caloriesData, heartRateData, sleepData, weightData, activityData] =
        await Promise.all([
          Promise.resolve({
            steps: 0,
            calories: 0,
            activeMinutes: 0,
            distance: 0
          }),
          safeGetData(() => getStepsData(session.accessToken!, numDays, lastDate), "getStepsData"),
          safeGetData(() => getCaloriesData(session.accessToken!, numDays, lastDate), "getCaloriesData"),
          safeGetData(() => getHeartRateData(session.accessToken!, numDays, lastDate), "getHeartRateData"),
          safeGetData(() => getSleepData(session.accessToken!, numDays, lastDate), "getSleepData"),
          safeGetData(() => getWeightData(session.accessToken!, 90, lastDate), "getWeightData"),
          safeGetData(() => getActivityData(session.accessToken!, numDays, lastDate), "getActivityData"),
        ]);
      
      // Filter to only include the exact dates selected
      const dateSet = new Set(dateList);
      const hrResultMulti = heartRateData as { data?: any[] };
      const hrDataMulti = hrResultMulti?.data || heartRateData;
      stepsData = (stepsData || []).filter(d => dateSet.has(d.date));
      caloriesData = (caloriesData || []).filter(d => dateSet.has(d.date));
      activityData = (activityData || []).filter(d => dateSet.has(d.date));
      heartRateData = ((hrDataMulti as any) || []).filter((d: any) => dateSet.has(d.date));
      sleepData = (sleepData || []).filter(d => dateSet.has(d.date));
      
      // Calculate the sum for todayData from the filtered data arrays
      const sumSteps = (stepsData || []).reduce((sum, d) => sum + d.steps, 0);
      const sumCalories = (caloriesData || []).reduce((sum, d) => sum + d.calories, 0);
      const sumActivity = (activityData || []).reduce((sum, d) => sum + d.activeMinutes, 0);
      const sumDistance = (activityData || []).reduce((sum, d) => sum + d.distance, 0);
      
      todayData = {
        steps: sumSteps,
        calories: sumCalories,
        activeMinutes: sumActivity,
        distance: sumDistance
      };
    } else {
      // Get data for a specific date (custom date or single date)
      [todayData, stepsData, caloriesData, heartRateData, sleepData, weightData, activityData] =
        await Promise.all([
          safeGetData(() => getDailyData(session.accessToken!, dateStr), "getDailyData"),
          safeGetData(() => getStepsData(session.accessToken!, 1, dateStr), "getStepsData"),
          safeGetData(() => getCaloriesData(session.accessToken!, 1, dateStr), "getCaloriesData"),
          safeGetData(() => getHeartRateData(session.accessToken!, 1, dateStr), "getHeartRateData"),
          safeGetData(() => getSleepData(session.accessToken!, 1, dateStr), "getSleepData"),
          safeGetData(() => getWeightData(session.accessToken!, 90, dateStr), "getWeightData"),
          safeGetData(() => getActivityData(session.accessToken!, 1, dateStr), "getActivityData"),
        ]);
    }

    console.log("[API Summary] Returning response:", {
      targetDate: dateStr,
      isTotal,
      isToday,
      stepsCount: stepsData?.length,
      sleepCount: sleepData?.length,
      sleepData: sleepData
    });
    
    // Handle null cases from safeGetData (when APIs fail)
    const safeData = <T>(data: T | null, defaultVal: T): T => data ?? defaultVal;
    
    // Extract heartRate data and debug info
    // Handle null case from safeGetData
    const heartRateResult = (heartRateData as { data?: any[]; debug?: any }) || { data: [], debug: {} };
    const heartRateArray = heartRateResult?.data || heartRateData || [];
    const heartRateDebug = heartRateResult?.debug || {};
    
    const response = {
      targetDate: dateStr,
      today: safeData(todayData, { steps: 0, calories: 0, activeMinutes: 0, distance: 0 }),
      steps: safeData(stepsData, []),
      calories: safeData(caloriesData, []),
      heartRate: heartRateArray,
      sleep: safeData(sleepData, []),
      weight: safeData(weightData, []),
      activity: safeData(activityData, []),
      _debug: {
        isTotal,
        isToday,
        dateStr,
        stepsCount: stepsData?.length,
        heartRateCount: heartRateArray?.length,
        heartRateSample: heartRateArray?.slice(0, 3),
        heartRateDebug
      }
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching fitness summary:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch fitness data";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
