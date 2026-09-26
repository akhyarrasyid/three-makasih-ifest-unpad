"use client";
import { useSyncExternalStore } from "react";
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

const emptySubscribe = () => () => {};

export function useIsMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

/**
 * React hook providing a live-ticking clock anchored strictly to Asia/Jakarta (WIB / UTC+7).
 * Safe from Next.js SSR hydration mismatch.
 */
export function useLiveJakartaTime(refreshIntervalMs = 1000): LiveJakartaTime {
  const mounted = useIsMounted();
  const timestamp = useSyncExternalStore(
    (onStoreChange) => {
      const interval = setInterval(onStoreChange, refreshIntervalMs);
      return () => clearInterval(interval);
    },
    () => Date.now(),
    () => 0
  );

  const activeTimestamp = timestamp > 0 ? timestamp : 1774579200000;
  const jTime = jakartaDayjs(activeTimestamp);

  return {
    timestamp: activeTimestamp,
    mounted,
    timeWithSeconds: mounted ? jTime.format("HH:mm:ss") : "--:--:--",
    timeShort: mounted ? jTime.format("HH:mm") : "--:--",
    timeZoneSuffix: "WIB",
    fullTime: mounted ? `${jTime.format("HH:mm:ss")} WIB` : "--:--:-- WIB",
    dateFormatted: mounted ? jTime.format("DD MMM YYYY") : "---",
    dayName: mounted ? jTime.format("dddd") : "---",
  };
}
