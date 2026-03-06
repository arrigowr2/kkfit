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
      // Use UTC to format date since Google Fit bucket timestamps are in UTC
      // This ensures consistent date formatting regardless of server timezone
      const date = (() => {
        const d = new Date(parseInt(bucket.startTimeMillis));
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
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

// Helper function to get list of ALL available data sources for this user
async function getAllAvailableDataSources(accessToken: string): Promise<string[]> {
  try {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    const url = new URL(`${FITNESS_API_BASE}/dataSources`);
    url.searchParams.set('startTime', oneDayAgo.toString());
    url.searchParams.set('endTime', now.toString());
    
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      console.log('[DataSources] Could not get all data sources:', response.status);
      return [];
    }
    
    const data = await response.json();
    const allSources = (data.dataSource || []).map((ds: any) => ds.dataSourceId);
    
    console.log('[DataSources] All available data sources count:', allSources.length);
    
    // Group by type for easier debugging
    const types: Record<string, string[]> = {};
    for (const source of allSources) {
      const match = source.match(/^(\w+):(\w+)\.(.+?):(.+)$/);
      if (match) {
        const type = match[2]; // e.g., heart_rate, steps, calories
        if (!types[type]) types[type] = [];
        types[type].push(source);
      }
    }
    console.log('[DataSources] Data types available:', Object.keys(types).join(', '));
    for (const [type, sources] of Object.entries(types)) {
      console.log(`[DataSources] ${type}:`, sources.join(', '));
    }
    
    return allSources;
  } catch (err) {
    console.log('[DataSources] Error getting all data sources:', err);
    return [];
  }
}

// Helper function to get list of available data sources for heart rate
async function getAvailableHeartRateDataSources(accessToken: string): Promise<string[]> {
  try {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    const url = new URL(`${FITNESS_API_BASE}/dataSources`);
    url.searchParams.set('startTime', oneDayAgo.toString());
    url.searchParams.set('endTime', now.toString());
    
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      console.log('[HeartRate] Could not get data sources:', response.status);
      return [];
    }
    
    const data = await response.json();
    const heartRateSources = (data.dataSource || []).filter((ds: any) => 
      ds.dataSourceId?.toLowerCase().includes('heart_rate')
    );
    
    console.log('[HeartRate] Available heart rate data sources:', heartRateSources.map((ds: any) => ds.dataSourceId));
    return heartRateSources.map((ds: any) => ds.dataSourceId);
  } catch (err) {
    console.log('[HeartRate] Error getting data sources:', err);
    return [];
  }
}

export async function getHeartRateData(
  accessToken: string,
  days: number = 30,
  specificDate?: string
): Promise<{ data: HeartRateData[]; debug: any }> {
  console.log("[HeartRate] getHeartRateData called with days:", days, "specificDate:", specificDate);
  
  // First, get ALL available data sources to see what data the user has
  const allSources = await getAllAvailableDataSources(accessToken);
  
  // Then, get heart rate specific sources
  const availableSources = await getAvailableHeartRateDataSources(accessToken);
  
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

  // If we have available sources from Google Fit, use those first
  let dataSourceIds: string[];
  if (availableSources.length > 0) {
    dataSourceIds = availableSources;
    console.log('[HeartRate] Using available sources from Google Fit:', dataSourceIds);
  } else {
    // Fall back to default data sources (including more device-specific sources)
    dataSourceIds = [
      // Most common data sources
      "derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm",
      "derived:com.google.heart_rate.bpm:com.google:merged",
      "derived:com.google.heart_rate.bpm:com.google.android.gms:estimated",
      // Raw data sources (from devices)
      "raw:com.google.heart_rate.bpm:Pixel Watch",
      "raw:com.google.heart_rate.bpm:garmin",
      "raw:com.google.heart_rate.bpm:wearos",
      // Additional derived sources
      "derived:com.google.heart_rate.bpm:com.google.android.gms:raw",
      "derived:com.google.heart_rate.bpm:com.google.android.gms:from_phones",
      // Samsung Health sources
      "raw:com.google.heart_rate.bpm:samsung",
      "raw:com.google.heart_rate.bpm:galaxy_watch",
      // Xiaomi/Amazfit sources
      "raw:com.google.heart_rate.bpm:amazfit",
      "raw:com.google.heart_rate.bpm:xiaomi",
      // Fitbit sources
      "raw:com.google.heart_rate.bpm:fitbit",
      // Generic raw
      "raw:com.google.heart_rate.bpm:",
      // More derived options
      "derived:com.google.heart_rate.bpm:com.google.android.gms:rest",
      "derived:com.google.heart_rate.bpm:com.google.android.gms:workout",
    ];
  }
  
  let allPoints: any[] = [];
  let usedDataSource: string | null = null;
  let datasetsApiWorked = false;
  
  // Try datasets API for each data source
  for (const dataSourceId of dataSourceIds) {
    try {
      const url = new URL(`${FITNESS_API_BASE}/datasets/${dataSourceId}-${startTime.getTime()}-${endTime.getTime()}`);
      console.log("[HeartRate] Trying datasets API with:", dataSourceId);
      
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      if (!response.ok) {
        console.log("[HeartRate] DataSource", dataSourceId, "failed:", response.status);
        continue;
      }
      
      const data = await response.json();
      console.log("[HeartRate] DataSource", dataSourceId, "returned", data.point?.length || 0, "points");
      
      if (data.point && data.point.length > 0) {
        allPoints = allPoints.concat(data.point);
        if (!usedDataSource) {
          usedDataSource = dataSourceId;
          datasetsApiWorked = true;
          console.log("[HeartRate] ✓ Using dataSource:", dataSourceId);
        }
      }
    } catch (err) {
      console.log("[HeartRate] Error with dataSource", dataSourceId, ":", err);
    }
  }
  
  console.log("[HeartRate] Used dataSource:", usedDataSource);
  console.log("[HeartRate] Total points from all sources:", allPoints.length);
  console.log("[HeartRate] Datasets API worked:", datasetsApiWorked);
  
  // If datasets API worked and has data, use it
  if (datasetsApiWorked && allPoints.length > 0) {
    // Process raw data points
    const result: HeartRateData[] = [];
    const dailyValues: Record<string, number[]> = {};
    
    for (const point of allPoints) {
      // Each point has startTime and endTime in nanoseconds - use LOCAL time
      const pointTime = parseInt(point.startTimeNanos || point.endTimeNanos) / 1000000;
      const d = new Date(pointTime);
      // Use LOCAL time instead of UTC
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const date = `${year}-${month}-${day}`;
      
      // Handle different value formats
      let value = 0;
      if (point.value?.[0]?.fpVal !== undefined) {
        value = point.value[0].fpVal;
      } else if (point.value?.[0]?.intVal !== undefined) {
        value = point.value[0].intVal;
      } else if (point.value?.[0]?.mapVal !== undefined) {
        // Some responses have nested values
        continue;
      }
      
      if (value > 0) {
        if (!dailyValues[date]) {
          dailyValues[date] = [];
        }
        dailyValues[date].push(value);
      }
    }
    
    console.log("[HeartRate] Daily values:", JSON.stringify(dailyValues));
    
    // Calculate min, max, avg for each day
    for (const date of Object.keys(dailyValues).sort()) {
      const values = dailyValues[date];
      if (values.length > 0) {
        const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
        const min = Math.round(Math.min(...values));
        const max = Math.round(Math.max(...values));
        console.log("[HeartRate]", date, "- min:", min, "max:", max, "avg:", avg, "count:", values.length);
        result.push({ date, avg, min, max });
      }
    }
    
    return { data: result.sort((a, b) => a.date.localeCompare(b.date)), debug: { dailyValues, method: "datasets", usedDataSource } };
  }
  
  // Fallback: Try aggregate API with different data source options
  console.log("[HeartRate] Datasets API didn't return data, trying aggregate with summary...");
  const aggregateResult = await getHeartRateDataWithSummary(accessToken, days, specificDate);
  return { data: aggregateResult.data, debug: { method: "aggregate", ...aggregateResult.debug } };
}

// Fallback: Try aggregate API with heart_rate.summary to get min/max/avg values
async function getHeartRateDataWithSummary(
  accessToken: string,
  days: number = 30,
  specificDate?: string
): Promise<{ data: HeartRateData[]; debug: any }> {
  let startTime: Date;
  let endTime: Date;
  
  if (specificDate) {
    const [year, month, day] = specificDate.split('-').map(Number);
    endTime = new Date(year, month - 1, day, 23, 59, 59);
    startTime = new Date(year, month - 1, day - (days - 1), 0, 0, 0);
  } else {
    endTime = new Date();
    startTime = new Date(endTime);
    startTime.setDate(startTime.getDate() - days);
  }

  // Try heart_rate.summary which provides min/max/avg values
  // Try multiple data sources as fallbacks
  const dataSourceIds = [
    // Summary sources
    "derived:com.google.heart_rate.summary:com.google.android.gms:aggregated",
    // BPM sources
    "derived:com.google.heart_rate.bpm:com.google.android.gms:aggregated",
    // Raw/estimated
    "derived:com.google.heart_rate.bpm:com.google.android.gms:raw",
    "derived:com.google.heart_rate.bpm:com.google.android.gms:estimated",
    // From phones
    "derived:com.google.heart_rate.bpm:com.google.android.gms:from_phones",
    // Legacy sources
    "derived:com.google.heart_rate.minutes:com.google.android.gms:aggregated",
    "derived:com.google.heart_rate:com.google.android.gms:aggregated",
  ];
  
  let lastError: Error | null = null;
  let data: any = null;
  let usedSummaryDataSource: string | null = null;
  
  for (const summaryDataSource of dataSourceIds) {
    try {
      const body = {
        aggregateBy: [
          {
            dataSourceId: summaryDataSource,
          },
        ],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startTime.getTime(),
        endTimeMillis: endTime.getTime(),
      };

      console.log("[HeartRate Summary] Trying dataSource:", summaryDataSource);

      data = await fetchFitData(accessToken, "/dataset:aggregate", body);
      usedSummaryDataSource = summaryDataSource;
      console.log("[HeartRate Summary] ✓ Success with dataSource:", summaryDataSource);
      break;
    } catch (err: any) {
      console.log("[HeartRate Summary] Error with", summaryDataSource, ":", err.message);
      lastError = err;
      // If it's a 403/404, try next data source
      if (err.message?.includes("403") || err.message?.includes("404") || err.message?.includes("not found") || err.message?.includes("not readable")) {
        continue;
      }
      // For other errors, throw immediately
      throw err;
    }
  }
  
  // If no data source worked, return empty array with debug info
  if (!data) {
    console.log("[HeartRate Summary] All data sources failed, returning empty array");
    return { 
      data: [], 
      debug: { 
        method: "aggregate_summary", 
        error: lastError?.message || "All data sources failed",
        triedDataSources: dataSourceIds 
      } 
    };
  }

  console.log("[HeartRate Summary] Raw API response:", JSON.stringify(data, null, 2));

  const result: HeartRateData[] = [];
  if (data.bucket) {
    for (const bucket of data.bucket) {
      // Use LOCAL time for date
      const d = new Date(parseInt(bucket.startTimeMillis));
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const date = `${year}-${month}-${day}`;
      
      console.log("[HeartRate Summary] Bucket date:", date);
      console.log("[HeartRate Summary] Bucket datasets:", JSON.stringify(bucket.dataset));
      
      let avg = 0, min = 0, max = 0;
      let foundDataSource = "unknown";
      
      // Check if there's a dataset with heart rate summary data
      if (bucket.dataset && bucket.dataset.length > 0) {
        for (const ds of bucket.dataset) {
          foundDataSource = ds.dataSourceId || "unknown";
          
          // Check if there are points with values
          if (ds.point && ds.point.length > 0) {
            for (const point of ds.point) {
              // The summary data can have different value formats
              if (point.value && point.value.length > 0) {
                for (const val of point.value) {
                  // Check for fpVal (floating point value)
                  if (val.fpVal !== undefined && val.fpVal > 0) {
                    if (avg === 0) avg = Math.round(val.fpVal);
                  }
                  // Check for mapVal which contains min/max/avg keys
                  if (val.mapVal && Array.isArray(val.mapVal)) {
                    for (const m of val.mapVal) {
                      if (m.key === "min" && m.value?.fpVal) {
                        min = Math.round(m.value.fpVal);
                      } else if (m.key === "max" && m.value?.fpVal) {
                        max = Math.round(m.value.fpVal);
                      } else if (m.key === "avg" && m.value?.fpVal) {
                        avg = Math.round(m.value.fpVal);
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      
      console.log("[HeartRate Summary]", date, ": avg=", avg, "min=", min, "max=", max, "from:", foundDataSource);
      
      // If we got valid data (avg > 0), use it
      if (avg > 0) {
        // If min/max are still 0, use avg as fallback (single reading)
        if (min === 0) min = avg;
        if (max === 0) max = avg;
        result.push({ date, avg, min, max });
      }
    }
  }

  console.log("[HeartRate Summary] Final result:", JSON.stringify(result));

  return { data: result.sort((a, b) => a.date.localeCompare(b.date)), debug: { 
    method: "aggregate_summary", 
    usedDataSource: usedSummaryDataSource || data.bucket?.[0]?.dataset?.[0]?.dataSourceId || "unknown",
    rawResponse: data ? JSON.stringify(data).substring(0, 1000) : "no data"
  } };
}

// Legacy function kept for compatibility
async function getHeartRateDataAggregate(
  accessToken: string,
  days: number = 30,
  specificDate?: string
): Promise<{ data: HeartRateData[]; debug: any }> {
  return getHeartRateDataWithSummary(accessToken, days, specificDate);
}

// Helper function to fetch sleep sessions from Google Fit Sessions API
async function fetchSleepSessions(
  accessToken: string,
  startTime: Date,
  endTime: Date
): Promise<SleepData[]> {
  // Google Fit Sessions API expects ISO 8601 format, not milliseconds
  const startTimeIso = startTime.toISOString();
  const endTimeIso = endTime.toISOString();
  
  const url = new URL(`${FITNESS_API_BASE}/sessions`);
  url.searchParams.append("startTime", startTimeIso);
  url.searchParams.append("endTime", endTimeIso);
  url.searchParams.append("activityType", "72"); // Sleep activity type
  
  console.log("[Sleep Sessions] Request URL:", url.toString());
  console.log("[Sleep Sessions] Start:", startTimeIso, "End:", endTimeIso);
  
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log("[Sleep Sessions] API error:", response.status, errorText);
    throw new Error(`Sleep Sessions API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log("[Sleep Sessions] Raw response:", JSON.stringify(data, null, 2));
  const sessions = data.session || [];
  console.log("[Sleep Sessions] Found sessions:", sessions.length);
  
  // Group sleep sessions by date
  const sleepByDate: Record<string, { duration: number; segments: number }> = {};
  
  for (const session of sessions) {
    const sessionStart = parseInt(session.startTimeMillis);
    const sessionEnd = parseInt(session.endTimeMillis);
    const duration = (sessionEnd - sessionStart) / 60000; // minutes
    
    // Use the session start date as the sleep date
    const date = (() => {
      const d = new Date(sessionStart);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })();
    
    if (!sleepByDate[date]) {
      sleepByDate[date] = { duration: 0, segments: 0 };
    }
    sleepByDate[date].duration += duration;
    sleepByDate[date].segments += 1;
  }
  
  // Convert to SleepData array
  return Object.entries(sleepByDate)
    .map(([date, data]) => {
      const totalMinutes = Math.round(data.duration);
      const quality =
        totalMinutes >= 420
          ? "Boa"
          : totalMinutes >= 360
            ? "Regular"
            : "Insuficiente";
      return { date, duration: totalMinutes, quality };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
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

  // Try fetching from Sessions API first (more reliable for sleep data)
  console.log("[Sleep] Fetching sleep data from", startTime.toISOString(), "to", endTime.toISOString());
  console.log("[Sleep] Access token present:", !!accessToken);
  try {
    const sessionData = await fetchSleepSessions(accessToken, startTime, endTime);
    console.log("[Sleep] Sessions API returned:", sessionData.length, "records");
    if (sessionData.length > 0) {
      console.log("[Sleep] Found data via Sessions API:", sessionData);
      return sessionData;
    }
    console.log("[Sleep] Sessions API returned empty, trying aggregate...");
  } catch (error) {
    console.error("[Sleep] Sessions API failed:", error);
    console.log("[Sleep] Falling back to aggregate API...");
  }

  // Fallback to aggregate data approach
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

  console.log("[Sleep] Aggregate API request:", JSON.stringify(body, null, 2));
  const data = await fetchFitData(accessToken, "/dataset:aggregate", body);
  console.log("[Sleep] Aggregate API response:", JSON.stringify(data, null, 2)?.substring(0, 2000));

  const result: SleepData[] = [];
  if (data.bucket) {
    console.log("[Sleep] Number of buckets:", data.bucket.length);
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

  console.log("[Sleep] Aggregate data result:", result.length, "records", result);
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
