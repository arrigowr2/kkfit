export interface FitDataPoint {
  startTime: number;
  endTime: number;
  value: number;
}

export interface DailySteps {
  date: string;
  steps: number;
}

export interface DailyCalories {
  date: string;
  calories: number;
}

export interface HeartRateData {
  date: string;
  avg: number;
  min: number;
  max: number;
}

export interface SleepData {
  date: string;
  duration: number; // in minutes
  quality: string;
}

export interface WeightData {
  date: string;
  weight: number; // in kg
}

export interface ActivityData {
  date: string;
  activeMinutes: number;
  distance: number; // in meters
}

const FITNESS_API_BASE = "https://www.googleapis.com/fitness/v1/users/me";

async function fetchFitData(
  accessToken: string,
  endpoint: string,
  body: object
) {
  const response = await fetch(`${FITNESS_API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Fit API error: ${response.status} - ${error}`);
  }

  return response.json();
}

function getNanoTime(date: Date): string {
  return (date.getTime() * 1_000_000).toString();
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp / 1_000_000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function getStepsData(
  accessToken: string,
  days: number = 30,
  specificDate?: string
): Promise<DailySteps[]> {
  let startTime: Date;
  let endTime: Date;
  
  if (specificDate) {
    // specificDate is the END date, calculate start from end - use manual parsing to avoid UTC issues
    const [year, month, day] = specificDate.split('-').map(Number);
    endTime = new Date(year, month - 1, day, 23, 59, 59);
    // days=1: start = same day at 00:00:00 (end of that day)
    // days=2: start = previous day at 00:00:00 (48 hours)
    // days=7: start = 6 days before at 00:00:00 (7 days)
    startTime = new Date(year, month - 1, day - (days - 1), 0, 0, 0);
  } else {
    endTime = new Date();
    startTime = new Date(endTime);
    startTime.setDate(startTime.getDate() - days);
  }

  console.log("[getStepsData] Requesting data:", {
    specificDate,
    days,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    startDateLocal: `${startTime.getFullYear()}-${String(startTime.getMonth() + 1).padStart(2, '0')}-${String(startTime.getDate()).padStart(2, '0')}`,
    endDateLocal: `${endTime.getFullYear()}-${String(endTime.getMonth() + 1).padStart(2, '0')}-${String(endTime.getDate()).padStart(2, '0')}`,
    serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });

  const body = {
    aggregateBy: [
      {
        dataTypeName: "com.google.step_count.delta",
        dataSourceId:
          "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps",
      },
    ],
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis: startTime.getTime(),
    endTimeMillis: endTime.getTime(),
  };

  const data = await fetchFitData(accessToken, "/dataset:aggregate", body);

  console.log("[getStepsData] Google Fit returned buckets:", data.bucket?.length || 0);
  if (data.bucket?.length > 0) {
    console.log("[getStepsData] First bucket startTimeMillis:", data.bucket[0].startTimeMillis, "->", new Date(parseInt(data.bucket[0].startTimeMillis)).toISOString());
    console.log("[getStepsData] Last bucket startTimeMillis:", data.bucket[data.bucket.length-1].startTimeMillis, "->", new Date(parseInt(data.bucket[data.bucket.length-1].startTimeMillis)).toISOString());
  }

  const result: DailySteps[] = [];
  if (data.bucket) {
    for (const bucket of data.bucket) {
      // Use UTC to format date since Google Fit bucket timestamps are in UTC
      // This ensures consistent date formatting regardless of server timezone
      const date = (() => {
        const d = new Date(parseInt(bucket.startTimeMillis));
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        const formatted = `${year}-${month}-${day}`;
        console.log(`[getStepsData] Bucket ${bucket.startTimeMillis} -> UTC: ${formatted}, Local: ${d.toISOString()}`);
        return formatted;
      })();
      let steps = 0;
      if (bucket.dataset?.[0]?.point?.length > 0) {
        for (const point of bucket.dataset[0].point) {
          steps += point.value?.[0]?.intVal || 0;
        }
      }
      result.push({ date, steps });
    }
  }

  console.log("[getStepsData] Returning data:", result.slice(-5));

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getCaloriesData(
  accessToken: string,
  days: number = 30,
  specificDate?: string
): Promise<DailyCalories[]> {
  let startTime: Date;
  let endTime: Date;
  
  if (specificDate) {
    // specificDate is the END date - use manual parsing to avoid UTC issues
    const [year, month, day] = specificDate.split('-').map(Number);
    endTime = new Date(year, month - 1, day, 23, 59, 59);
    startTime = new Date(year, month - 1, day - (days - 1), 0, 0, 0);
  } else {
    endTime = new Date();
    startTime = new Date(endTime);
    startTime.setDate(startTime.getDate() - days);
  }

  const body = {
    aggregateBy: [
      {
        dataTypeName: "com.google.calories.expended",
      },
    ],
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis: startTime.getTime(),
    endTimeMillis: endTime.getTime(),
  };

  const data = await fetchFitData(accessToken, "/dataset:aggregate", body);

  const result: DailyCalories[] = [];
  if (data.bucket) {
    for (const bucket of data.bucket) {
      const date = (() => {
        // Use UTC to format date since Google Fit bucket timestamps are in UTC
        const d = new Date(parseInt(bucket.startTimeMillis));
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })();
      let calories = 0;
      if (bucket.dataset?.[0]?.point?.length > 0) {
        for (const point of bucket.dataset[0].point) {
          calories += point.value?.[0]?.fpVal || 0;
        }
      }
      result.push({ date, calories: Math.round(calories) });
    }
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getHeartRateData(
  accessToken: string,
  days: number = 30,
  specificDate?: string
): Promise<HeartRateData[]> {
  let startTime: Date;
  let endTime: Date;
  
  if (specificDate) {
    // specificDate is the END date - use manual parsing to avoid UTC issues
    const [year, month, day] = specificDate.split('-').map(Number);
    endTime = new Date(year, month - 1, day, 23, 59, 59);
    startTime = new Date(year, month - 1, day - (days - 1), 0, 0, 0);
  } else {
    endTime = new Date();
    startTime = new Date(endTime);
    startTime.setDate(startTime.getDate() - days);
  }

  const body = {
    aggregateBy: [
      {
        dataTypeName: "com.google.heart_rate.bpm",
      },
    ],
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis: startTime.getTime(),
    endTimeMillis: endTime.getTime(),
  };

  const data = await fetchFitData(accessToken, "/dataset:aggregate", body);

  const result: HeartRateData[] = [];
  if (data.bucket) {
    for (const bucket of data.bucket) {
      const date = (() => {
        // Use UTC to format date since Google Fit bucket timestamps are in UTC
        const d = new Date(parseInt(bucket.startTimeMillis));
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })();
      let avg = 0,
        min = 0,
        max = 0;
      if (bucket.dataset?.[0]?.point?.length > 0) {
        const values = bucket.dataset[0].point.map(
          (p: { value: { fpVal: number }[] }) => p.value?.[0]?.fpVal || 0
        );
        avg = Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length);
        min = Math.round(Math.min(...values));
        max = Math.round(Math.max(...values));
      }
      if (avg > 0) {
        result.push({ date, avg, min, max });
      }
    }
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getSleepData(
  accessToken: string,
  days: number = 30,
  specificDate?: string
): Promise<SleepData[]> {
  let startTime: Date;
  let endTime: Date;
  
  if (specificDate) {
    // specificDate is the END date - use manual parsing to avoid UTC issues
    const [year, month, day] = specificDate.split('-').map(Number);
    endTime = new Date(year, month - 1, day, 23, 59, 59);
    startTime = new Date(year, month - 1, day - (days - 1), 0, 0, 0);
  } else {
    endTime = new Date();
    startTime = new Date(endTime);
    startTime.setDate(startTime.getDate() - days);
  }

  const body = {
    aggregateBy: [
      {
        dataTypeName: "com.google.sleep.segment",
      },
    ],
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis: startTime.getTime(),
    endTimeMillis: endTime.getTime(),
  };

  const data = await fetchFitData(accessToken, "/dataset:aggregate", body);

  const result: SleepData[] = [];
  if (data.bucket) {
    for (const bucket of data.bucket) {
      const date = (() => {
        // Use UTC to format date since Google Fit bucket timestamps are in UTC
        const d = new Date(parseInt(bucket.startTimeMillis));
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })();
      let totalMinutes = 0;
      if (bucket.dataset?.[0]?.point?.length > 0) {
        for (const point of bucket.dataset[0].point) {
          const start = parseInt(point.startTimeNanos) / 1_000_000;
          const end = parseInt(point.endTimeNanos) / 1_000_000;
          totalMinutes += (end - start) / 60000;
        }
      }
      if (totalMinutes > 0) {
        const quality =
          totalMinutes >= 420
            ? "Boa"
            : totalMinutes >= 360
              ? "Regular"
              : "Insuficiente";
        result.push({ date, duration: Math.round(totalMinutes), quality });
      }
    }
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getWeightData(
  accessToken: string,
  days: number = 90,
  specificDate?: string
): Promise<WeightData[]> {
  let startTime: Date;
  let endTime: Date;
  
  if (specificDate) {
    // specificDate is the END date - use manual parsing to avoid UTC issues
    const [year, month, day] = specificDate.split('-').map(Number);
    endTime = new Date(year, month - 1, day, 23, 59, 59);
    startTime = new Date(year, month - 1, day - (days - 1), 0, 0, 0);
  } else {
    endTime = new Date();
    startTime = new Date(endTime);
    startTime.setDate(startTime.getDate() - days);
  }

  const body = {
    aggregateBy: [
      {
        dataTypeName: "com.google.weight",
      },
    ],
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis: startTime.getTime(),
    endTimeMillis: endTime.getTime(),
  };

  const data = await fetchFitData(accessToken, "/dataset:aggregate", body);

  const result: WeightData[] = [];
  if (data.bucket) {
    for (const bucket of data.bucket) {
      const date = (() => {
        // Use UTC to format date since Google Fit bucket timestamps are in UTC
        const d = new Date(parseInt(bucket.startTimeMillis));
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })();
      if (bucket.dataset?.[0]?.point?.length > 0) {
        const weight = bucket.dataset[0].point[0].value?.[0]?.fpVal;
        if (weight) {
          result.push({ date, weight: Math.round(weight * 10) / 10 });
        }
      }
    }
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getActivityData(
  accessToken: string,
  days: number = 30,
  specificDate?: string
): Promise<ActivityData[]> {
  let startTime: Date;
  let endTime: Date;
  
  if (specificDate) {
    // specificDate is the END date - use manual parsing to avoid UTC issues
    const [year, month, day] = specificDate.split('-').map(Number);
    endTime = new Date(year, month - 1, day, 23, 59, 59);
    startTime = new Date(year, month - 1, day - (days - 1), 0, 0, 0);
  } else {
    endTime = new Date();
    startTime = new Date(endTime);
    startTime.setDate(startTime.getDate() - days);
  }

  const [activeMinutesData, distanceData] = await Promise.all([
    fetchFitData(accessToken, "/dataset:aggregate", {
      aggregateBy: [{ dataTypeName: "com.google.active_minutes" }],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: startTime.getTime(),
      endTimeMillis: endTime.getTime(),
    }),
    fetchFitData(accessToken, "/dataset:aggregate", {
      aggregateBy: [{ dataTypeName: "com.google.distance.delta" }],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: startTime.getTime(),
      endTimeMillis: endTime.getTime(),
    }),
  ]);

  const activeMinutesMap: Record<string, number> = {};
  if (activeMinutesData.bucket) {
    for (const bucket of activeMinutesData.bucket) {
      const date = (() => {
        // Use UTC to format date since Google Fit bucket timestamps are in UTC
        const d = new Date(parseInt(bucket.startTimeMillis));
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })();
      let minutes = 0;
      if (bucket.dataset?.[0]?.point?.length > 0) {
        for (const point of bucket.dataset[0].point) {
          minutes += point.value?.[0]?.intVal || 0;
        }
      }
      activeMinutesMap[date] = minutes;
    }
  }

  const result: ActivityData[] = [];
  if (distanceData.bucket) {
    for (const bucket of distanceData.bucket) {
      const date = (() => {
        // Use UTC to format date since Google Fit bucket timestamps are in UTC
        const d = new Date(parseInt(bucket.startTimeMillis));
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })();
      let distance = 0;
      if (bucket.dataset?.[0]?.point?.length > 0) {
        for (const point of bucket.dataset[0].point) {
          distance += point.value?.[0]?.fpVal || 0;
        }
      }
      result.push({
        date,
        activeMinutes: activeMinutesMap[date] || 0,
        distance: Math.round(distance),
      });
    }
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getTodaySummary(accessToken: string) {
  // Use local date for consistency with user timezone
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  
  const targetDate = new Date(todayStr + "T00:00:00");
  const endDate = new Date(targetDate);
  endDate.setDate(endDate.getDate() + 1);

  const body = {
    aggregateBy: [
      { dataTypeName: "com.google.step_count.delta" },
      { dataTypeName: "com.google.calories.expended" },
      { dataTypeName: "com.google.active_minutes" },
      { dataTypeName: "com.google.distance.delta" },
    ],
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis: targetDate.getTime(),
    endTimeMillis: endDate.getTime(),
  };

  const data = await fetchFitData(accessToken, "/dataset:aggregate", body);

  let steps = 0,
    calories = 0,
    activeMinutes = 0,
    distance = 0;

  if (data.bucket?.[0]) {
    const bucket = data.bucket[0];
    for (const dataset of bucket.dataset || []) {
      for (const point of dataset.point || []) {
        const typeName = dataset.dataSourceId || "";
        if (typeName.includes("step_count")) {
          steps += point.value?.[0]?.intVal || 0;
        } else if (typeName.includes("calories")) {
          calories += point.value?.[0]?.fpVal || 0;
        } else if (typeName.includes("active_minutes")) {
          activeMinutes += point.value?.[0]?.intVal || 0;
        } else if (typeName.includes("distance")) {
          distance += point.value?.[0]?.fpVal || 0;
        }
      }
    }

    // Try by index if dataSourceId doesn't match
    if (steps === 0 && calories === 0) {
      const datasets = bucket.dataset || [];
      if (datasets[0]?.point?.length > 0) {
        for (const p of datasets[0].point) steps += p.value?.[0]?.intVal || 0;
      }
      if (datasets[1]?.point?.length > 0) {
        for (const p of datasets[1].point)
          calories += p.value?.[0]?.fpVal || 0;
      }
      if (datasets[2]?.point?.length > 0) {
        for (const p of datasets[2].point)
          activeMinutes += p.value?.[0]?.intVal || 0;
      }
      if (datasets[3]?.point?.length > 0) {
        for (const p of datasets[3].point)
          distance += p.value?.[0]?.fpVal || 0;
      }
    }
  }

  return {
    steps,
    calories: Math.round(calories),
    activeMinutes,
    distance: Math.round(distance),
  };
}

// Get data for a specific date
export async function getDailyData(accessToken: string, dateStr: string) {
  // Parse date components manually to avoid UTC timezone issues
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day); // month is 0-indexed
  const endDate = new Date(year, month - 1, day + 1);

  const body = {
    aggregateBy: [
      { dataTypeName: "com.google.step_count.delta" },
      { dataTypeName: "com.google.calories.expended" },
      { dataTypeName: "com.google.active_minutes" },
      { dataTypeName: "com.google.distance.delta" },
    ],
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis: targetDate.getTime(),
    endTimeMillis: endDate.getTime(),
  };

  const data = await fetchFitData(accessToken, "/dataset:aggregate", body);

  let steps = 0,
    calories = 0,
    activeMinutes = 0,
    distance = 0;

  if (data.bucket?.[0]) {
    const bucket = data.bucket[0];
    for (const dataset of bucket.dataset || []) {
      for (const point of dataset.point || []) {
        const typeName = dataset.dataSourceId || "";
        if (typeName.includes("step_count")) {
          steps += point.value?.[0]?.intVal || 0;
        } else if (typeName.includes("calories")) {
          calories += point.value?.[0]?.fpVal || 0;
        } else if (typeName.includes("active_minutes")) {
          activeMinutes += point.value?.[0]?.intVal || 0;
        } else if (typeName.includes("distance")) {
          distance += point.value?.[0]?.fpVal || 0;
        }
      }
    }

    // Try by index if dataSourceId doesn't match
    if (steps === 0 && calories === 0) {
      const datasets = bucket.dataset || [];
      if (datasets[0]?.point?.length > 0) {
        for (const p of datasets[0].point) steps += p.value?.[0]?.intVal || 0;
      }
      if (datasets[1]?.point?.length > 0) {
        for (const p of datasets[1].point)
          calories += p.value?.[0]?.fpVal || 0;
      }
      if (datasets[2]?.point?.length > 0) {
        for (const p of datasets[2].point)
          activeMinutes += p.value?.[0]?.intVal || 0;
      }
      if (datasets[3]?.point?.length > 0) {
        for (const p of datasets[3].point)
          distance += p.value?.[0]?.fpVal || 0;
      }
    }
  }

  return {
    steps,
    calories: Math.round(calories),
    activeMinutes,
    distance: Math.round(distance),
  };
}
