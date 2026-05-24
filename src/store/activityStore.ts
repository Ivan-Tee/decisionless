import { create } from "zustand";
import { appStorage } from "@/persistence/storage";
import type { Activity, ActivityLog, TodayPlan, TodayPlanItem } from "@/types/activity";
import { getLocalDateKey, isSameLocalDay, roundDownToNearestFive } from "@/utils/date";

type AvailableTimeSource = "manual" | "google_calendar";

type ActivityState = {
  hasHydrated: boolean;
  activities: Activity[];
  history: ActivityLog[];
  todayPlan: TodayPlan | null;
  activityPlanVersion: number;
  hasCompletedOnboarding: boolean;
  dailyAvailableMinutes: number;
  availableTimeSource: AvailableTimeSource;
  setHasHydrated: (value: boolean) => void;
  addActivity: (activity: Activity) => void;
  updateActivity: (activityId: string, updates: Activity) => void;
  updateActivityImportance: (activityId: string, importance: number) => void;
  deleteActivity: (activityId: string) => void;
  completeOnboarding: () => void;
  setDailyAvailableMinutes: (minutes: number, source?: AvailableTimeSource) => void;
  setTodayPlan: (plan: TodayPlan | null) => void;
  markCompletedToday: (activityId: string, minutes: number) => void;
  restoreCompletedToday: (activityId: string, historyEntryId?: string) => void;
  startOver: () => Promise<void>;
  resetAll: () => void;
};

type PersistedActivityState = Pick<
  ActivityState,
  | "activities"
  | "history"
  | "todayPlan"
  | "activityPlanVersion"
  | "hasCompletedOnboarding"
  | "dailyAvailableMinutes"
  | "availableTimeSource"
>;

const STORAGE_KEY = "priority-flow-mobile-store";

const defaultState = {
  activities: [],
  history: [],
  todayPlan: null,
  activityPlanVersion: 0,
  hasCompletedOnboarding: false,
  dailyAvailableMinutes: 0,
  availableTimeSource: "manual" as AvailableTimeSource
};

function normalizeImportance(importance: unknown) {
  return typeof importance === "number" && Number.isFinite(importance)
    ? Math.min(10, Math.max(1, Math.round(importance)))
    : 5;
}

function normalizePositiveMinutes(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : fallback;
}

function normalizeAvailableMinutes(minutes: number) {
  return roundDownToNearestFive(minutes);
}

function normalizeActivity(activity: Activity): Activity {
  const minimumSessionMinutes = normalizePositiveMinutes(activity.minimumSessionMinutes, 20);
  const idealSessionMinutes = Math.max(
    normalizePositiveMinutes(
      activity.idealSessionMinutes,
      Math.round(minimumSessionMinutes * 1.5)
    ),
    minimumSessionMinutes
  );

  const hasNoRhythm = Boolean(activity.hasNoRhythm);
  const frequencyPerWeek =
    hasNoRhythm || typeof activity.frequencyPerWeek !== "number" || !Number.isFinite(activity.frequencyPerWeek)
      ? undefined
      : Math.max(0.05, activity.frequencyPerWeek);

  return {
    id: activity.id,
    name: activity.name,
    type: activity.type,
    importance: normalizeImportance(activity.importance),
    lastCompleted: activity.lastCompleted,
    minimumSessionMinutes,
    idealSessionMinutes,
    preferredDays: activity.preferredDays,
    frequencyPerWeek,
    isDaily: !hasNoRhythm && Boolean(activity.isDaily),
    hasNoRhythm
  };
}

function clearPlanItemCompletion(item: TodayPlanItem): TodayPlanItem {
  const { completedAt, ...rest } = item;
  return rest;
}

function restoreTodayPlanItem(
  plan: TodayPlan | null,
  state: ActivityState,
  restoredEntry: ActivityLog
): TodayPlan {
  const restoredItem: TodayPlanItem = {
    activityId: restoredEntry.activityId,
    score: restoredEntry.score ?? 0,
    neglect: restoredEntry.neglect ?? 0,
    allocatedMinutes: restoredEntry.minutes,
    ...(restoredEntry.isShortSession ? { isShortSession: restoredEntry.isShortSession } : {}),
    rationale: restoredEntry.rationale ?? `${restoredEntry.activityName} was part of today's original plan.`
  };
  const basePlan: TodayPlan =
    plan ?? {
      dateKey: getLocalDateKey(),
      availableMinutes: state.dailyAvailableMinutes,
      activityPlanVersion: state.activityPlanVersion,
      items: []
    };
  const existingIndex = basePlan.items.findIndex((item) => item.activityId === restoredEntry.activityId);

  if (existingIndex >= 0) {
    return {
      ...basePlan,
      items: basePlan.items.map((item) =>
        item.activityId === restoredEntry.activityId ? clearPlanItemCompletion(item) : item
      )
    };
  }

  const nextItems = [...basePlan.items];
  const restoredIndex =
    typeof restoredEntry.planIndex === "number"
      ? Math.min(Math.max(restoredEntry.planIndex, 0), nextItems.length)
      : nextItems.length;

  nextItems.splice(restoredIndex, 0, restoredItem);

  return {
    ...basePlan,
    items: nextItems
  };
}

function getPersistedState(state: ActivityState): PersistedActivityState {
  return {
    activities: state.activities,
    history: state.history,
    todayPlan: state.todayPlan,
    activityPlanVersion: state.activityPlanVersion,
    hasCompletedOnboarding: state.hasCompletedOnboarding,
    dailyAvailableMinutes: state.dailyAvailableMinutes,
    availableTimeSource: state.availableTimeSource
  };
}

function readPersistedState(rawValue: string | null): Partial<PersistedActivityState> {
  if (!rawValue) {
    return {};
  }

  const parsed = JSON.parse(rawValue);
  return parsed?.state ?? parsed;
}

export const useActivityStore = create<ActivityState>()((set) => ({
  hasHydrated: false,
  ...defaultState,
  setHasHydrated: (value) => set({ hasHydrated: value }),
  addActivity: (activity) =>
    set((state) => ({
      activities: [...state.activities, normalizeActivity(activity)],
      activityPlanVersion: state.activityPlanVersion + 1
    })),
  updateActivity: (activityId, updates) =>
    set((state) => ({
      activities: state.activities.map((activity) =>
        activity.id === activityId
          ? normalizeActivity({
              ...updates,
              id: activity.id
            })
          : activity
      ),
      activityPlanVersion: state.activityPlanVersion + 1
    })),
  updateActivityImportance: (activityId, importance) =>
    set((state) => ({
      activities: state.activities.map((activity) =>
        activity.id === activityId
          ? { ...activity, importance: normalizeImportance(importance) }
          : activity
      ),
      activityPlanVersion: state.activityPlanVersion + 1
    })),
  deleteActivity: (activityId) =>
    set((state) => ({
      activities: state.activities.filter((activity) => activity.id !== activityId),
      history: state.history.filter((entry) => entry.activityId !== activityId),
      todayPlan: state.todayPlan
        ? {
            ...state.todayPlan,
            items: state.todayPlan.items.filter((item) => item.activityId !== activityId)
          }
        : null,
      activityPlanVersion: state.activityPlanVersion + 1
  })),
  completeOnboarding: () => set({ hasCompletedOnboarding: true }),
  setDailyAvailableMinutes: (minutes, source = "manual") =>
    set({ dailyAvailableMinutes: normalizeAvailableMinutes(minutes), availableTimeSource: source }),
  setTodayPlan: (plan) => set({ todayPlan: plan }),
  markCompletedToday: (activityId, minutes) =>
    set((state) => {
      const target = state.activities.find((activity) => activity.id === activityId);
      if (!target) {
        return state;
      }

      const completedAt = new Date().toISOString();
      const alreadyCompletedToday = state.history.some(
        (entry) => entry.activityId === activityId && isSameLocalDay(entry.completedAt)
      );

      if (alreadyCompletedToday) {
        return state;
      }

      const planIndex = state.todayPlan?.items.findIndex((item) => item.activityId === activityId) ?? -1;
      const plannedItem = planIndex >= 0 ? state.todayPlan?.items[planIndex] : undefined;
      const completedMinutes = plannedItem?.allocatedMinutes ?? minutes;

      return {
        activities: state.activities.map((activity) =>
          activity.id === activityId ? { ...activity, lastCompleted: completedAt } : activity
        ),
        todayPlan: state.todayPlan
          ? {
              ...state.todayPlan,
              items: state.todayPlan.items.map((item) =>
                item.activityId === activityId ? { ...item, completedAt } : item
              )
            }
          : null,
        history: [
          {
            id: `${activityId}-${Date.now()}`,
            activityId,
            activityName: target.name,
            completedAt,
            minutes: completedMinutes,
            previousLastCompleted: target.lastCompleted,
            ...(planIndex >= 0 ? { planIndex } : {}),
            score: plannedItem?.score ?? 0,
            neglect: plannedItem?.neglect ?? 0,
            isShortSession: plannedItem?.isShortSession,
            rationale: plannedItem?.rationale ?? `${target.name} was part of today's original plan.`
          },
          ...state.history
        ]
      };
    }),
  restoreCompletedToday: (activityId, historyEntryId) =>
    set((state) => {
      const target = state.activities.find((activity) => activity.id === activityId);

      if (!target) {
        return state;
      }

      const todayCompletion = state.history.find((entry) =>
        historyEntryId
          ? entry.id === historyEntryId && entry.activityId === activityId && isSameLocalDay(entry.completedAt)
          : entry.activityId === activityId && isSameLocalDay(entry.completedAt)
      );

      if (!todayCompletion) {
        return state;
      }

      const remainingHistory = state.history.filter((entry) =>
        historyEntryId
          ? entry.id !== historyEntryId
          : entry.activityId !== activityId || !isSameLocalDay(entry.completedAt)
      );
      const latestOlderCompletion = remainingHistory
        .filter((entry) => entry.activityId === activityId)
        .sort((left, right) => new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime())[0];

      return {
        activities: state.activities.map((activity) =>
          activity.id === activityId
            ? {
                ...activity,
                lastCompleted:
                  todayCompletion.previousLastCompleted ?? latestOlderCompletion?.completedAt ?? ""
              }
            : activity
        ),
        todayPlan: restoreTodayPlanItem(state.todayPlan, state, todayCompletion),
        history: remainingHistory
      };
    }),
  startOver: async () => {
    await appStorage.removeItem(STORAGE_KEY);
    set({
      hasHydrated: true,
      ...defaultState
    });
  },
  resetAll: () =>
    set({
      hasHydrated: true,
      ...defaultState
    })
}));

useActivityStore.subscribe((state) => {
  if (!state.hasHydrated) {
    return;
  }

  void appStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      state: getPersistedState(state),
      version: 0
    })
  );
});

void appStorage
  .getItem(STORAGE_KEY)
  .then((rawValue) => {
    const storedState = readPersistedState(rawValue);

    useActivityStore.setState({
      activities: (storedState.activities ?? []).map(normalizeActivity),
      history: storedState.history ?? [],
      todayPlan: storedState.todayPlan ?? null,
      activityPlanVersion: storedState.activityPlanVersion ?? 0,
      hasCompletedOnboarding: Boolean(storedState.hasCompletedOnboarding),
      dailyAvailableMinutes:
        typeof storedState.dailyAvailableMinutes === "number"
          ? normalizeAvailableMinutes(storedState.dailyAvailableMinutes)
          : 0,
      availableTimeSource:
        storedState.availableTimeSource === "google_calendar" ? "google_calendar" : "manual",
      hasHydrated: true
    });
  })
  .catch(() => {
    useActivityStore.setState({ hasHydrated: true });
  });
