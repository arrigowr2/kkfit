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
  const days = parseInt(searchParams.get("days") || "30");

  // Check if requesting multiple dates
  const isMultiple = mode === "multiple" && dateParam && dateParam.includes(",");

  // Check if requesting all data (Total)
  const isTotal = dateParam === "total" || dateParam === "" || dateParam === null || dateParam === undefined;

  // Check if requesting today
  const isToday = dateParam === "today";

  // Determine the target date
  let targetDate: Date;
  let dateStr: string;

  console.log("[Summary API] Request params:", { dateParam, mode, isMultiple, isToday, isTotal });

  if (isTotal) {
    // Total - get all data, no specific date
    targetDate = new Date();
    dateStr = "";
    console.log("[Summary API] Mode: TOTAL");
  } else if (isToday) {
    // Today - use today's date in local time
    targetDate = new Date();
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    dateStr = `${year}-${month}-${day}`;
    console.log("[Summary API] Mode: TODAY, dateStr:", dateStr, "server time:", targetDate.toISOString());
  } else if (dateParam === "yesterday") {
    // Yesterday - use yesterday's date in local time
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    targetDate = yesterday;
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    dateStr = `${year}-${month}-${day}`;
    console.log("[Summary API] Mode: YESTERDAY, dateStr:", dateStr, "server time:", targetDate.toISOString());
  } else if (dateParam && dateParam !== "yesterday" && !dateParam.includes(",")) {
    // Single custom date - parse manually to avoid UTC issues
    const [year, month, day] = dateParam.split('-').map(Number);
    targetDate = new Date(year, month - 1, day); // month is 0-indexed
    dateStr = dateParam;
    console.log("[Summary API] Mode: SINGLE DATE, dateStr:", dateStr);
  } else if (isMultiple) {
    // Multiple dates - will be handled later
    targetDate = new Date();
    dateStr = dateParam || "";
    console.log("[Summary API] Mode: MULTIPLE DATES, dateParam:", dateParam);
  } else {
    targetDate = new Date();
    dateStr = targetDate.toISOString().split("T")[0];
    console.log("[Summary API] Mode: DEFAULT, dateStr:", dateStr);
  }

  if (isNaN(targetDate.getTime())) {
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 });
  }

  try {
    let todayData;
    let stepsData, caloriesData, heartRateData, sleepData, weightData, activityData;

    if (isTotal) {
      // Get all data (Total) - no specific date, get maximum historical data
      // For Total, calculate sum from all historical data
      [stepsData, caloriesData, heartRateData, sleepData, weightData, activityData] =
        await Promise.all([
          getStepsData(session.accessToken, 90),
          getCaloriesData(session.accessToken, 90),
          getHeartRateData(session.accessToken, 90),
          getSleepData(session.accessToken, 90),
          getWeightData(session.accessToken, 90),
          getActivityData(session.accessToken, 90),
        ]);
      
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
      console.log("[Summary API] isToday=true, todayStr:", todayStr, "dateStr:", dateStr);
      
      [todayData, stepsData, caloriesData, heartRateData, sleepData, weightData, activityData] =
        await Promise.all([
          getTodaySummary(session.accessToken),
          getStepsData(session.accessToken, 30),
          getCaloriesData(session.accessToken, 30),
          getHeartRateData(session.accessToken, 30),
          getSleepData(session.accessToken, 30),
          getWeightData(session.accessToken, 90),
          getActivityData(session.accessToken, 30),
        ]);
      
      console.log("[Summary API] TODAY mode - todayStr:", todayStr);
      console.log("[Summary API] Steps data before filter (last 10):", stepsData?.slice(-10));
      console.log("[Summary API] Steps data dates:", stepsData?.map(d => d.date));
      // Filter data to only show today (for client-side display consistency)
      const beforeFilterCount = stepsData?.length || 0;
      stepsData = (stepsData || []).filter(d => d.date === todayStr);
      caloriesData = (caloriesData || []).filter(d => d.date === todayStr);
      activityData = (activityData || []).filter(d => d.date === todayStr);
      heartRateData = (heartRateData || []).filter(d => d.date === todayStr);
      sleepData = (sleepData || []).filter(d => d.date === todayStr);
      console.log(`[Summary API] Filtered from ${beforeFilterCount} to ${stepsData.length} steps entries for date ${todayStr}`);
    } else if (isMultiple) {
      // Multiple dates - comma-separated
      const dateList = dateParam.split(",").map(d => d.trim());
      console.log("[Summary API] Multiple dates - dateList:", dateList);
      // Sort dates and calculate the range properly
      const sortedDates = [...dateList].sort();
      const firstDate = sortedDates[0];
      const lastDate = sortedDates[sortedDates.length - 1];
      console.log("[Summary API] firstDate:", firstDate, "lastDate:", lastDate);
      // Parse dates manually to avoid UTC issues
      const [firstYear, firstMonth, firstDay] = firstDate.split('-').map(Number);
      const [lastYear, lastMonth, lastDay] = lastDate.split('-').map(Number);
      const first = new Date(firstYear, firstMonth - 1, firstDay);
      const last = new Date(lastYear, lastMonth - 1, lastDay);
      // Calculate actual number of days in the range
      const daysDiff = (last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24);
      const numDays = Math.round(daysDiff) + 1;
      console.log("[Summary API] daysDiff:", daysDiff, "numDays:", numDays);
      
      // Get data for the date range - use lastDate to calculate range correctly
      console.log("[Summary API] Calling Google Fit with numDays:", numDays, "lastDate:", lastDate);
      [todayData, stepsData, caloriesData, heartRateData, sleepData, weightData, activityData] =
        await Promise.all([
          Promise.resolve({
            steps: 0,
            calories: 0,
            activeMinutes: 0,
            distance: 0
          }),
          getStepsData(session.accessToken, numDays, lastDate),
          getCaloriesData(session.accessToken, numDays, lastDate),
          getHeartRateData(session.accessToken, numDays, lastDate),
          getSleepData(session.accessToken, numDays, lastDate),
          getWeightData(session.accessToken, 90, lastDate),
          getActivityData(session.accessToken, numDays, lastDate),
        ]);
      console.log("[Summary API] Raw steps data from Google Fit:", stepsData?.map(d => d.date));
      
      // Filter to only include the exact dates selected
      const dateSet = new Set(dateList);
      console.log("[Summary API] === FILTERING DATA ===");
      console.log("[Summary API] User selected dates (dateSet):", [...dateSet]);
      console.log("[Summary API] Steps data from Google Fit:", stepsData?.map(d => `${d.date}=${d.steps}`));
      console.log("[Summary API] Calories data from Google Fit:", caloriesData?.map(d => `${d.date}=${d.calories}`));
      console.log("[Summary API] Activity data from Google Fit:", activityData?.map(d => `${d.date}=${d.activeMinutes}`));
      stepsData = (stepsData || []).filter(d => dateSet.has(d.date));
      caloriesData = (caloriesData || []).filter(d => dateSet.has(d.date));
      activityData = (activityData || []).filter(d => dateSet.has(d.date));
      heartRateData = (heartRateData || []).filter(d => dateSet.has(d.date));
      sleepData = (sleepData || []).filter(d => dateSet.has(d.date));
      console.log("[Summary API] Steps data AFTER filter:", stepsData);
      console.log("[Summary API] Calories data AFTER filter:", caloriesData);
      console.log("[Summary API] Activity data AFTER filter:", activityData);
      
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
          getDailyData(session.accessToken, dateStr),
          getStepsData(session.accessToken, 1, dateStr),
          getCaloriesData(session.accessToken, 1, dateStr),
          getHeartRateData(session.accessToken, 1, dateStr),
          getSleepData(session.accessToken, 1, dateStr),
          getWeightData(session.accessToken, 90, dateStr),
          getActivityData(session.accessToken, 1, dateStr),
        ]);
    }

    const response = {
      targetDate: dateStr,
      today: todayData,
      steps: stepsData,
      calories: caloriesData,
      heartRate: heartRateData,
      sleep: sleepData,
      weight: weightData,
      activity: activityData,
    };
    console.log("[Summary API] Response targetDate:", dateStr);
    console.log("[Summary API] Response steps count:", stepsData?.length);
    console.log("[Summary API] Response steps dates:", stepsData?.map(d => d.date));
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
