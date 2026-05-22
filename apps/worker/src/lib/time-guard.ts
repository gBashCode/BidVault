import ntpClient from 'ntp-client';

let mockNtpOffsetMs: number | null = null;
let bypassNtpSync = false;

export function setMockNtpOffset(offsetMs: number | null): void {
  mockNtpOffsetMs = offsetMs;
}

export function setBypassNtpSync(bypass: boolean): void {
  bypassNtpSync = bypass;
}

export async function fetchNtpTime(): Promise<Date> {
  if (mockNtpOffsetMs !== null) {
    return new Date(Date.now() + mockNtpOffsetMs);
  }

  const servers = ['time.google.com', 'pool.ntp.org'];
  for (const server of servers) {
    try {
      return await new Promise<Date>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('NTP query timeout'));
        }, 2000);

        ntpClient.getNetworkTime(server, 123, (err, date) => {
          clearTimeout(timeout);
          if (err) {
            reject(err);
          } else {
            resolve(date);
          }
        });
      });
    } catch (e) {
      // Continue to next server
    }
  }

  // If offline/sandbox testing and NTP is unreachable, fallback to system clock
  if (bypassNtpSync || process.env.BYPASS_NTP_SYNC === 'true' || process.env.NODE_ENV === 'test') {
    return new Date();
  }

  throw new Error('NTP_SERVERS_UNREACHABLE');
}

let lastDriftMs = 0;

export function getLastDriftMs(): number {
  return lastDriftMs;
}

export async function assertTimeSync(): Promise<void> {
  const systemTime = Date.now();
  const ntpTimeDate = await fetchNtpTime();
  const ntpTime = ntpTimeDate.getTime();
  const drift = Math.abs(systemTime - ntpTime);
  lastDriftMs = drift;

  if (drift > 5000) {
    throw new Error('CLOCK_DRIFT_DETECTED');
  }
}
