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
  return new Date(timestamp / 1_000_000).toISOString().split("T")[0];
}

export async function getStepsData(
  accessToken: string,
  days: number = 30,
  specificDate?: string
): Promise<DailySteps[]> {
  const endTime = specificDate 
    ? new Date(specificDate + "T23:59:59") 
    : new Date();
  const startTime = new Date(endTime);
  startTime.setDate(startTime.getDate() - days);

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

  const result: DailySteps[] = [];
  if (data.bucket) {
    for (const bucket of data.bucket) {
      const date = new Date(parseInt(bucket.startTimeMillis))
        .toISOString()
        .split("T")[0];
      let steps = 0;
      if (bucket.dataset?.[0]?.point?.length > 0) {
        for (const point of bucket.dataset[0].point) {
          steps += point.value?.[0]?.intVal || 0;
        }
      }
      result.push({ date, steps });
    }
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getCaloriesData(
  accessToken: string,
  days: number = 30,
  specificDate?: string
): Promise<DailyCalories[]> {
  const endTime = specificDate 
    ? new Date(specificDate + "T23:59:59") 
    : new Date();
  const startTime = new Date(endTime);
  startTime.setDate(startTime.getDate() - days);

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
      const date = new Date(parseInt(bucket.startTimeMillis))
        .toISOString()
        .split("T")[0];
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
  const endTime = specificDate 
    ? new Date(specificDate + "T23:59:59") 
    : new Date();
  const startTime = new Date(endTime);
  startTime.setDate(startTime.getDate() - days);

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
      const date = new Date(parseInt(bucket.startTimeMillis))
        .toISOString()
        .split("T")[0];
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
  const endTime = specificDate 
    ? new Date(specificDate + "T23:59:59") 
    : new Date();
  const startTime = new Date(endTime);
  startTime.setDate(startTime.getDate() - days);

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
      const date = new Date(parseInt(bucket.startTimeMillis))
        .toISOString()
        .split("T")[0];
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
  const endTime = specificDate 
    ? new Date(specificDate + "T23:59:59") 
    : new Date();
  const startTime = new Date(endTime);
  startTime.setDate(startTime.getDate() - days);

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
      const date = new Date(parseInt(bucket.startTimeMillis))
        .toISOString()
        .split("T")[0];
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
  const endTime = specificDate 
    ? new Date(specificDate + "T23:59:59") 
    : new Date();
  const startTime = new Date(endTime);
  startTime.setDate(startTime.getDate() - days);

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
      const date = new Date(parseInt(bucket.startTimeMillis))
        .toISOString()
        .split("T")[0];
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
      const date = new Date(parseInt(bucket.startTimeMillis))
        .toISOString()
        .split("T")[0];
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const body = {
    aggregateBy: [
      { dataTypeName: "com.google.step_count.delta" },
      { dataTypeName: "com.google.calories.expended" },
      { dataTypeName: "com.google.active_minutes" },
      { dataTypeName: "com.google.distance.delta" },
    ],
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis: today.getTime(),
    endTimeMillis: tomorrow.getTime(),
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
  const targetDate = new Date(dateStr + "T00:00:00");
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
