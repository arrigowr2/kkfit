import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getStepsData, getActivityData } from "@/lib/google-fit";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const mode = searchParams.get("mode");
  const datesParam = searchParams.get("dates");
  const days = parseInt(searchParams.get("days") || "30");

  // Check if requesting multiple dates
  const isMultiple = mode === "multiple" && 
    ((dateParam && dateParam.includes(",")) || (datesParam && datesParam.includes(",")));

  try {
    let stepsData, activityData;

    if (isMultiple) {
      // Multiple dates - comma-separated (use datesParam if available, fallback to dateParam)
      const datesSource = datesParam || dateParam || "";
      const dateList = datesSource.split(",").map(d => d.trim()).filter(d => d.length > 0);
      
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
      
      // Get data for the date range
      [stepsData, activityData] = await Promise.all([
        getStepsData(session.accessToken, numDays, lastDate),
        getActivityData(session.accessToken, numDays, lastDate),
      ]);
      
      // Filter to only include the exact dates selected
      const dateSet = new Set(dateList);
      stepsData = (stepsData || []).filter((d: {date: string}) => dateSet.has(d.date));
      activityData = (activityData || []).filter((d: {date: string}) => dateSet.has(d.date));
    } else if (dateParam === "today" || dateParam === "yesterday") {
      // Single day mode - get 30 days and filter
      const todayStr = (() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })();
      
      const yesterdayStr = (() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const year = yesterday.getFullYear();
        const month = String(yesterday.getMonth() + 1).padStart(2, '0');
        const day = String(yesterday.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })();
      
      const targetDate = dateParam === "today" ? todayStr : yesterdayStr;
      
      [stepsData, activityData] = await Promise.all([
        getStepsData(session.accessToken, 30),
        getActivityData(session.accessToken, 30),
      ]);
      
      // Filter to only show the target date
      stepsData = (stepsData || []).filter((d: {date: string}) => d.date === targetDate);
      activityData = (activityData || []).filter((d: {date: string}) => d.date === targetDate);
    } else if (dateParam === "total") {
      // Total mode - get all data
      [stepsData, activityData] = await Promise.all([
        getStepsData(session.accessToken, 90),
        getActivityData(session.accessToken, 90),
      ]);
    } else if (dateParam && !dateParam.includes(",")) {
      // Single custom date
      [stepsData, activityData] = await Promise.all([
        getStepsData(session.accessToken, 1, dateParam),
        getActivityData(session.accessToken, 1, dateParam),
      ]);
    } else {
      // Default - last 30 days
      [stepsData, activityData] = await Promise.all([
        getStepsData(session.accessToken, days),
        getActivityData(session.accessToken, days),
      ]);
    }

    // Merge steps and activity data
    const mergedData = stepsData.map((step: {date: string; steps: number}) => {
      const activity = activityData.find((a: {date: string}) => a.date === step.date);
      return {
        date: step.date,
        steps: step.steps,
        calories: activity ? Math.round(activity.activeMinutes * 5) : 0, // Estimativa
        distance: activity?.distance || 0,
        activeMinutes: activity?.activeMinutes || 0,
      };
    });

    return NextResponse.json(mergedData);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch steps data" },
      { status: 500 }
    );
  }
}
