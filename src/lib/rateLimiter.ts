const LOCKOUT_KEY = "timpla_device_lockout_until";
const ATTEMPTS_KEY = "timpla_rapid_order_attempts";

// 1. Max time gap (in ms) between orders to count as a "rapid attempt" (e.g. 5 seconds)
export const RAPID_INTERVAL_MS = 8 * 1000;

// 2. Number of rapid attempts (within RAPID_INTERVAL_MS gap) required to trigger lockout
export const MAX_RAPID_ATTEMPTS = 4;

// 3. Lockout duration in milliseconds (e.g. 10 minutes)
export const LOCKOUT_DURATION_MS = 5 * 60 * 1000;

export interface DeviceLockoutStatus {
  isLocked: boolean;
  remainingMinutes: number;
  remainingSeconds: number;
}

export interface RecordAttemptResult {
  triggeredLockout: boolean;
  lockoutUntil?: number;
  remainingMinutes?: number;
}

interface RapidAttemptData {
  lastAttemptTime: number;
  rapidCount: number;
}

/**
 * Check if the device is currently locked out from ordering due to rapid order spam.
 */
export function checkDeviceLockout(): DeviceLockoutStatus {
  try {
    const rawLockout = localStorage.getItem(LOCKOUT_KEY);
    if (rawLockout) {
      const lockoutUntil = Number(rawLockout);
      const now = Date.now();
      if (lockoutUntil > now) {
        const remainingMs = lockoutUntil - now;
        return {
          isLocked: true,
          remainingMinutes: Math.ceil(remainingMs / (60 * 1000)),
          remainingSeconds: Math.ceil(remainingMs / 1000),
        };
      } else {
        // Lockout expired, remove key
        localStorage.removeItem(LOCKOUT_KEY);
      }
    }
  } catch (e) {
    console.warn("Device lockout check error:", e);
  }

  return { isLocked: false, remainingMinutes: 0, remainingSeconds: 0 };
}

/**
 * Record an order attempt. If an order attempt occurs within RAPID_INTERVAL_MS (8s)
 * of the previous attempt, the rapid count increments. Reaching MAX_RAPID_ATTEMPTS (4)
 * triggers a 5-minute lockout for the device.
 */
export function recordOrderAttempt(): RecordAttemptResult {
  try {
    // First verify if already locked out
    const currentLockout = checkDeviceLockout();
    if (currentLockout.isLocked) {
      return {
        triggeredLockout: true,
        remainingMinutes: currentLockout.remainingMinutes,
      };
    }

    const now = Date.now();
    let rapidData: RapidAttemptData = { lastAttemptTime: 0, rapidCount: 0 };

    const rawData = localStorage.getItem(ATTEMPTS_KEY);
    if (rawData) {
      try {
        const parsed = JSON.parse(rawData);
        if (parsed && typeof parsed.lastAttemptTime === "number" && typeof parsed.rapidCount === "number") {
          rapidData = parsed;
        }
      } catch (e) {}
    }

    const timeSinceLast = now - rapidData.lastAttemptTime;

    let newRapidCount = 1;
    if (rapidData.lastAttemptTime > 0 && timeSinceLast <= RAPID_INTERVAL_MS) {
      // Order was placed within RAPID_INTERVAL_MS (5s) of previous order -> count as rapid attempt!
      newRapidCount = rapidData.rapidCount + 1;
    } else {
      // Order gap was greater than RAPID_INTERVAL_MS (5s) -> reset rapid counter
      newRapidCount = 1;
    }

    if (newRapidCount >= MAX_RAPID_ATTEMPTS) {
      // Trigger 10-minute device lockout
      const lockoutUntil = now + LOCKOUT_DURATION_MS;
      localStorage.setItem(LOCKOUT_KEY, String(lockoutUntil));
      localStorage.removeItem(ATTEMPTS_KEY);
      return {
        triggeredLockout: true,
        lockoutUntil,
        remainingMinutes: Math.ceil(LOCKOUT_DURATION_MS / (60 * 1000)),
      };
    } else {
      localStorage.setItem(
        ATTEMPTS_KEY,
        JSON.stringify({ lastAttemptTime: now, rapidCount: newRapidCount })
      );
      return { triggeredLockout: false };
    }
  } catch (e) {
    console.warn("Record order attempt error:", e);
    return { triggeredLockout: false };
  }
}
