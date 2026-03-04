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
    console.log("[Summary API] isYesterday=true, dateStr:", dateStr);
  } else if (dateParam && dateParam !== "yesterday" && !dateParam.includes(",")) {
    // Single custom date - not multiple dates
    targetDate = new Date(dateParam + "T00:00:00");
    dateStr = dateParam;
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
      
      console.log("[Summary API] Steps data before filter:", stepsData?.slice(-5));
      // Filter data to only show today (for client-side display consistency)
      stepsData = (stepsData || []).filter(d => d.date === todayStr);
      caloriesData = (caloriesData || []).filter(d => d.date === todayStr);
      activityData = (activityData || []).filter(d => d.date === todayStr);
      heartRateData = (heartRateData || []).filter(d => d.date === todayStr);
      sleepData = (sleepData || []).filter(d => d.date === todayStr);
      console.log("[Summary API] Steps data after filter:", stepsData);
    } else if (isMultiple) {
      // Multiple dates - comma-separated
      const dateList = dateParam.split(",").map(d => d.trim());
      // Sort dates and calculate the range properly
      const sortedDates = [...dateList].sort();
      const firstDate = sortedDates[0];
      const lastDate = sortedDates[sortedDates.length - 1];
      const first = new Date(firstDate + "T00:00:00");
      const last = new Date(lastDate + "T00:00:00");
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
          getStepsData(session.accessToken, numDays, lastDate),
          getCaloriesData(session.accessToken, numDays, lastDate),
          getHeartRateData(session.accessToken, numDays, lastDate),
          getSleepData(session.accessToken, numDays, lastDate),
          getWeightData(session.accessToken, 90, lastDate),
          getActivityData(session.accessToken, numDays, lastDate),
        ]);
      
      // Filter to only include the exact dates selected
      const dateSet = new Set(dateList);
      stepsData = (stepsData || []).filter(d => dateSet.has(d.date));
      caloriesData = (caloriesData || []).filter(d => dateSet.has(d.date));
      activityData = (activityData || []).filter(d => dateSet.has(d.date));
      heartRateData = (heartRateData || []).filter(d => dateSet.has(d.date));
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
          getDailyData(session.accessToken, dateStr),
          getStepsData(session.accessToken, 1, dateStr),
          getCaloriesData(session.accessToken, 1, dateStr),
          getHeartRateData(session.accessToken, 1, dateStr),
          getSleepData(session.accessToken, 1, dateStr),
          getWeightData(session.accessToken, 90, dateStr),
          getActivityData(session.accessToken, 1, dateStr),
        ]);
    }

    return NextResponse.json({
      targetDate: dateStr,
      today: todayData,
      steps: stepsData,
      calories: caloriesData,
      heartRate: heartRateData,
      sleep: sleepData,
      weight: weightData,
      activity: activityData,
    });
  } catch (error) {
    console.error("Error fetching fitness summary:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch fitness data";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
