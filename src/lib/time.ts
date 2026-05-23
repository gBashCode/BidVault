// src/lib/time.ts
let timeOffset = 0;
let isSynced = false;

/**
 * Syncs the global time by checking against an external reliable time API.
 * This ensures that regardless of the local system clock, the countdowns
 * are perfectly synchronized across all browsers.
 */
export async function syncGlobalTime() {
  if (isSynced) return;
  try {
    const start = Date.now();
    const res = await fetch("https://worldtimeapi.org/api/timezone/Etc/UTC");
    if (!res.ok) throw new Error("Failed to fetch world time");
    
    const data = await res.json();
    const end = Date.now();
    const roundTrip = end - start;
    
    // Calculate precise server time factoring in network latency
    const serverTime = new Date(data.utc_datetime).getTime() + (roundTrip / 2);
    timeOffset = serverTime - Date.now();
    isSynced = true;
    console.log(`[TimeSync] Synchronized global clock. Local offset: ${timeOffset}ms`);
  } catch (e) {
    console.warn("[TimeSync] Failed to sync global time, falling back to local clock", e);
    // If it fails (e.g., rate limits), we gracefully fallback to offset=0
  }
}

/**
 * Returns the perfectly synchronized global current time in milliseconds.
 */
export function getGlobalTime() {
  return Date.now() + timeOffset;
}
