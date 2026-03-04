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
    // Today - use today's date
    targetDate = new Date();
    dateStr = targetDate.toISOString().split("T")[0];
  } else if (dateParam === "yesterday") {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    targetDate = yesterday;
    dateStr = targetDate.toISOString().split("T")[0];
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
      // Get today's summary and last 30 days for charts
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
    } else if (isMultiple) {
      // Multiple dates - comma-separated - calculate sum from the data arrays
      const dateList = dateParam.split(",").filter(d => d.trim());
      const firstDate = dateList[0];
      const lastDate = dateList[dateList.length - 1];
      const first = new Date(firstDate + "T00:00:00");
      const last = new Date(lastDate + "T00:00:00");
      const numDays = Math.ceil((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      // Get data for all selected dates
      [todayData, stepsData, caloriesData, heartRateData, sleepData, weightData, activityData] =
        await Promise.all([
          // For multiple dates, calculate sum from steps/calories/activity data
          Promise.resolve({
            steps: 0,
            calories: 0,
            activeMinutes: 0,
            distance: 0
          }),
          getStepsData(session.accessToken, numDays, firstDate), // From first to last date
          getCaloriesData(session.accessToken, numDays, firstDate),
          getHeartRateData(session.accessToken, numDays, firstDate),
          getSleepData(session.accessToken, numDays, firstDate),
          getWeightData(session.accessToken, 90, lastDate),
          getActivityData(session.accessToken, numDays, firstDate),
        ]);
      
      // Calculate the sum for todayData from the data arrays
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
      // Get data for a specific date (yesterday or custom date)
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
