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
  const dateParam = searchParams.get("date"); // YYYY-MM-DD format, or null for today
  const days = parseInt(searchParams.get("days") || "30");

  // Determine the target date
  let targetDate: Date;
  let dateStr: string;

  if (dateParam && dateParam !== "yesterday") {
    targetDate = new Date(dateParam + "T00:00:00");
    dateStr = dateParam;
  } else if (dateParam === "yesterday") {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    targetDate = yesterday;
    dateStr = targetDate.toISOString().split("T")[0];
  } else {
    targetDate = new Date();
    dateStr = targetDate.toISOString().split("T")[0];
  }

  if (isNaN(targetDate.getTime())) {
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 });
  }

  // Check if requesting today or a specific date
  const isToday = dateStr === new Date().toISOString().split("T")[0];

  try {
    let todayData;
    let stepsData, caloriesData, heartRateData, sleepData, weightData, activityData;

    if (isToday) {
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
