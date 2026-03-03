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
} from "@/lib/google-fit";

export async function GET() {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [today, steps, calories, heartRate, sleep, weight, activity] =
      await Promise.allSettled([
        getTodaySummary(session.accessToken),
        getStepsData(session.accessToken, 30),
        getCaloriesData(session.accessToken, 30),
        getHeartRateData(session.accessToken, 30),
        getSleepData(session.accessToken, 30),
        getWeightData(session.accessToken, 90),
        getActivityData(session.accessToken, 30),
      ]);

    return NextResponse.json({
      today: today.status === "fulfilled" ? today.value : null,
      steps: steps.status === "fulfilled" ? steps.value : [],
      calories: calories.status === "fulfilled" ? calories.value : [],
      heartRate: heartRate.status === "fulfilled" ? heartRate.value : [],
      sleep: sleep.status === "fulfilled" ? sleep.value : [],
      weight: weight.status === "fulfilled" ? weight.value : [],
      activity: activity.status === "fulfilled" ? activity.value : [],
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
