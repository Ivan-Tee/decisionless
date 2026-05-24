export type ActivityKind = "maintenance" | "progress";

export type Activity = {
  id: string;
  name: string;
  type: ActivityKind;
  importance: number;
  lastCompleted: string;
  minimumSessionMinutes: number;
  idealSessionMinutes: number;
  preferredDays?: number[];
  frequencyPerWeek?: number;
  isDaily?: boolean;
  hasNoRhythm?: boolean;
};

export type ActivityDraft = {
  name: string;
  type: ActivityKind | null;
  importance: number | null;
  frequencyPerWeek: number | null;
  minimumSessionMinutes: number | null;
  idealSessionMinutes: number | null;
  preferredDays: number[];
  hasNoRhythm: boolean;
};

export type ActivityLog = {
  id: string;
  activityId: string;
  activityName: string;
  completedAt: string;
  minutes: number;
  previousLastCompleted?: string;
  planIndex?: number;
  score?: number;
  neglect?: number;
  isShortSession?: boolean;
  isRecommendedBelowMinimum?: boolean;
  rationale?: string;
};

export type Recommendation = {
  activity: Activity;
  score: number;
  neglect: number;
  allocatedMinutes: number;
  isShortSession?: boolean;
  isRecommendedBelowMinimum?: boolean;
  rationale: string;
};

export type TodayPlanItem = {
  activityId: string;
  score: number;
  neglect: number;
  allocatedMinutes: number;
  isShortSession?: boolean;
  isRecommendedBelowMinimum?: boolean;
  rationale: string;
  completedAt?: string;
};

export type TodayPlan = {
  dateKey: string;
  availableMinutes: number;
  activityPlanVersion: number;
  items: TodayPlanItem[];
};
