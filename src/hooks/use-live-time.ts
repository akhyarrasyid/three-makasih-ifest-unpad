"use client";
import { useEffect, useState } from "react";
import { jakartaDayjs } from "@/lib/time";

export interface LiveJakartaTime {
  timestamp: number;
  mounted: boolean;
  timeWithSeconds: string;
  timeShort: string;
  timeZoneSuffix: string;
  fullTime: string;
  dateFormatted: string;
  dayName: string;
}

/**
 * React hook providing a live-ticking clock anchored strictly to Asia/Jakarta (WIB / UTC+7).
 * Safe from Next.js SSR hydration mismatch.
 */
export function useLiveJakartaTime(refreshIntervalMs = 1000): LiveJakartaTime {
  const [now, setNow] = useState<number>(() => Date.now());
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const interval = setInterval(() => {
      setNow(Date.now());
    }, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [refreshIntervalMs]);

  const jTime = jakartaDayjs(now);

  return {
    timestamp: now,
    mounted,
    timeWithSeconds: jTime.format("HH:mm:ss"),
    timeShort: jTime.format("HH:mm"),
    timeZoneSuffix: "WIB",
    fullTime: `${jTime.format("HH:mm:ss")} WIB`,
    dateFormatted: jTime.format("DD MMM YYYY"),
    dayName: jTime.format("dddd"),
  };
}
