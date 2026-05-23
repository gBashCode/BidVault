import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import dayjs from "dayjs";

let timeOffset = 0;

export function useServerTime() {
  const { data } = useQuery({
    queryKey: ["server-time"],
    queryFn: async () => {
      const res = await apiClient.get("/v1/time");
      return res.data;
    },
    refetchInterval: 30000,
    staleTime: 15000,
    refetchOnWindowFocus: true,
  });

  if (data && typeof data.serverTime === "number") {
    timeOffset = data.serverTime - Date.now();
  }

  return {
    now: () => Date.now() + timeOffset,
    offset: timeOffset,
  };
}

export function dayjsServer(date?: any) {
  if (date === undefined) {
    return dayjs(Date.now() + timeOffset);
  }
  return dayjs(date);
}
