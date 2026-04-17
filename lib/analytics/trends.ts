export type TrendRange = "today" | "week" | "month" | "all";

export type PeriodWindow = {
  range: TrendRange;
  now: Date;
  currentStart: Date | null;
  currentEnd: Date;
  previousStart: Date | null;
  previousEnd: Date | null;
};

export type TrendDirection = "up" | "down" | "flat" | "na";

export type TrendState = {
  label: string;
  direction: TrendDirection;
  isAvailable: boolean;
  deltaPercent: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseTrendRange(input?: string | null): TrendRange {
  if (input === "today" || input === "week" || input === "month" || input === "all") {
    return input;
  }
  return "week";
}

export function getPeriodWindow(range: TrendRange, now = new Date()): PeriodWindow {
  const currentEnd = new Date(now);
  if (range === "all") {
    return {
      range,
      now: new Date(now),
      currentStart: null,
      currentEnd,
      previousStart: null,
      previousEnd: null,
    };
  }

  if (range === "today") {
    const currentStart = new Date(now);
    currentStart.setHours(0, 0, 0, 0);
    const previousStart = new Date(currentStart.getTime() - DAY_MS);
    return {
      range,
      now: new Date(now),
      currentStart,
      currentEnd,
      previousStart,
      previousEnd: currentStart,
    };
  }

  const durationMs = range === "week" ? 7 * DAY_MS : 30 * DAY_MS;
  const currentStart = new Date(currentEnd.getTime() - durationMs);
  const previousStart = new Date(currentStart.getTime() - durationMs);

  return {
    range,
    now: new Date(now),
    currentStart,
    currentEnd,
    previousStart,
    previousEnd: currentStart,
  };
}

export function computePercentDelta(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export function formatPercentSigned(value: number) {
  if (!Number.isFinite(value)) return "N/A";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatTrendState(current: number, previous: number): TrendState {
  const delta = computePercentDelta(current, previous);
  if (delta === null) {
    if (current === 0 && previous === 0) {
      return {
        label: "Collecting data...",
        direction: "na",
        isAvailable: false,
        deltaPercent: null,
      };
    }

    if (previous === 0 && current > 0) {
      return {
        label: "New",
        direction: "up",
        isAvailable: false,
        deltaPercent: null,
      };
    }

    return {
      label: "No baseline",
      direction: "na",
      isAvailable: false,
      deltaPercent: null,
    };
  }

  const direction: TrendDirection = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return {
    label: formatPercentSigned(delta),
    direction,
    isAvailable: true,
    deltaPercent: delta,
  };
}

export function trendRangeLabel(range: TrendRange): string {
  if (range === "today") return "last 24h";
  if (range === "week") return "last 7d";
  if (range === "month") return "last 30d";
  return "all time";
}
