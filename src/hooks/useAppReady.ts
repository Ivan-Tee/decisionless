import { useActivityStore } from "@/store/activityStore";

export function useAppReady() {
  return useActivityStore((state) => state.hasHydrated);
}
