import type { Activity, Recommendation } from "@/types/activity";
import { formatMinutes, getTodayIndex, roundDownToNearestFive } from "@/utils/date";

const DEFAULT_IMPORTANCE = 5;
const PROGRESS_DECAY_CAP = 120;
const SHORT_SESSION_LIMIT = 20;
const URGENCY_WEIGHT = 0;

type ScoredActivity = {
  activity: Activity;
  score: number;
  neglect: number;
  daysSinceLastDone: number;
  rationale: string;
};

function getSafeImportance(activity: Activity) {
  return typeof activity.importance === "number" && Number.isFinite(activity.importance)
    ? Math.min(10, Math.max(1, Math.round(activity.importance)))
    : DEFAULT_IMPORTANCE;
}

function getCalendarDayDifference(isoDate: string | undefined, now: Date) {
  if (!isoDate) {
    return 7;
  }

  const then = new Date(isoDate);
  if (Number.isNaN(then.getTime())) {
    return 7;
  }

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfThen = new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime();
  const dayInMs = 1000 * 60 * 60 * 24;

  return Math.max(0, Math.floor((startOfToday - startOfThen) / dayInMs));
}

function hasFlexibleRhythm(activity: Activity) {
  return activity.type === "maintenance" && Boolean(activity.hasNoRhythm);
}

function getImportanceWeight(activity: Activity) {
  const weight = getSafeImportance(activity) * 10;
  return hasFlexibleRhythm(activity) ? Math.round(weight * 0.7) : weight;
}

function getScheduleWeight(activity: Activity, todayIndex: number) {
  if (hasFlexibleRhythm(activity)) {
    return 0;
  }

  const isScheduledToday = activity.preferredDays?.includes(todayIndex) ?? false;

  if (isScheduledToday) {
    return 90;
  }

  if (activity.isDaily) {
    return 80;
  }

  return 0;
}

function getConsistencyWeight(activity: Activity) {
  if (hasFlexibleRhythm(activity)) {
    return 0;
  }

  return activity.type === "maintenance" ? 30 : 0;
}

function getDecayWeight(activity: Activity, daysSinceLastDone: number) {
  if (hasFlexibleRhythm(activity)) {
    return Math.min(daysSinceLastDone * 3, 35);
  }

  if (activity.type === "progress") {
    const slowRise = daysSinceLastDone * 12;
    const longNeglectBoost = Math.max(0, daysSinceLastDone - 3) * 20;

    return Math.min(slowRise + longNeglectBoost, PROGRESS_DECAY_CAP);
  }

  if (activity.isDaily) {
    return daysSinceLastDone * 25;
  }

  const frequencyPerWeek = Math.max(1, activity.frequencyPerWeek ?? 1);
  const expectedGap = 7 / frequencyPerWeek;
  const overdueDays = daysSinceLastDone - expectedGap;

  return overdueDays > 0 ? 100 + overdueDays * 20 : 0;
}

function getFitWithAvailableTime(activity: Activity, availableMinutes: number) {
  if (activity.minimumSessionMinutes <= availableMinutes) {
    return 15;
  }

  return Math.max(0, 10 - (activity.minimumSessionMinutes - availableMinutes) / 10);
}

function getRecentlyDonePenalty(daysSinceLastDone: number) {
  if (daysSinceLastDone === 0) {
    return 100;
  }

  if (daysSinceLastDone === 1) {
    return 40;
  }

  if (daysSinceLastDone === 2) {
    return 20;
  }

  return 0;
}

function getRationale(
  activity: Activity,
  daysSinceLastDone: number,
  isScheduledToday: boolean,
  decayWeight: number
) {
  if (hasFlexibleRhythm(activity)) {
    return `${activity.name} is optional and flexible, so it only appears when there is calm spare attention.`;
  }

  if (activity.type === "maintenance") {
    if (isScheduledToday) {
      return `${activity.name} is scheduled for today, so it stays close to the top.`;
    }

    if (activity.isDaily) {
      return `${activity.name} protects a daily rhythm, even if today's session is small.`;
    }

    if (decayWeight > 0) {
      return `${activity.name} is drifting past its usual rhythm and is worth restoring.`;
    }

    return `${activity.name} supports consistency without making the day rigid.`;
  }

  if (daysSinceLastDone >= 5) {
    return `${activity.name} has waited long enough to become a strong progress priority.`;
  }

  return `${activity.name} matters, but progress urgency builds gradually when it was touched recently.`;
}

function scoreActivities(
  activities: Activity[],
  availableMinutes: number,
  now: Date
): ScoredActivity[] {
  const todayIndex = getTodayIndex(now);

  return activities
    .map((activity) => {
      const daysSinceLastDone = getCalendarDayDifference(activity.lastCompleted, now);
      const isScheduledToday = activity.preferredDays?.includes(todayIndex) ?? false;
      const importanceWeight = getImportanceWeight(activity);
      const scheduleWeight = getScheduleWeight(activity, todayIndex);
      const consistencyWeight = getConsistencyWeight(activity);
      const decayWeight = getDecayWeight(activity, daysSinceLastDone);
      const recentlyDonePenalty = getRecentlyDonePenalty(daysSinceLastDone);
      const fitWithAvailableTime = getFitWithAvailableTime(activity, availableMinutes);
      const score =
        importanceWeight +
        scheduleWeight +
        decayWeight +
        consistencyWeight +
        URGENCY_WEIGHT -
        recentlyDonePenalty +
        fitWithAvailableTime;

      return {
        activity,
        score,
        neglect: decayWeight,
        daysSinceLastDone,
        rationale: getRationale(activity, daysSinceLastDone, isScheduledToday, decayWeight)
      };
    })
    .sort((left, right) => right.score - left.score || left.activity.name.localeCompare(right.activity.name));
}

export function generateRecommendations(
  activities: Activity[],
  availableMinutes: number,
  now = new Date()
): Recommendation[] {
  const roundedAvailableMinutes = roundDownToNearestFive(availableMinutes);

  if (activities.length === 0 || roundedAvailableMinutes <= 0) {
    return [];
  }

  return roundRecommendationAllocations(
    allocateTimeByPriorityBands(
      scoreActivities(activities, roundedAvailableMinutes, now),
      roundedAvailableMinutes,
      now
    )
  );
}

function roundRecommendationAllocations(recommendations: Recommendation[]) {
  return recommendations
    .map((recommendation) => ({
      ...recommendation,
      allocatedMinutes: roundDownToNearestFive(recommendation.allocatedMinutes)
    }))
    .filter((recommendation) => recommendation.allocatedMinutes > 0);
}

function getSessionBounds(activity: Activity) {
  const minimum =
    typeof activity.minimumSessionMinutes === "number" &&
    Number.isFinite(activity.minimumSessionMinutes) &&
    activity.minimumSessionMinutes > 0
      ? Math.round(activity.minimumSessionMinutes)
      : 20;
  const defaultIdeal = Math.max(Math.round(minimum * 1.5), minimum);
  const ideal =
    typeof activity.idealSessionMinutes === "number" &&
    Number.isFinite(activity.idealSessionMinutes) &&
    activity.idealSessionMinutes > 0
      ? Math.max(minimum, Math.round(activity.idealSessionMinutes))
      : defaultIdeal;

  return {
    minimum,
    ideal
  };
}

function allocateTimeByPriorityBands(
  candidates: ScoredActivity[],
  availableMinutes: number,
  now: Date
): Recommendation[] {
  const maintenanceCandidates = candidates.filter(
    (candidate) => candidate.activity.type === "maintenance" && !hasFlexibleRhythm(candidate.activity)
  );
  const progressCandidates = candidates.filter(
    (candidate) => candidate.activity.type === "progress" || hasFlexibleRhythm(candidate.activity)
  );
  const maintenanceRecommendations = allocateFairTimeByPriorityBands(
    maintenanceCandidates,
    availableMinutes,
    now,
    progressCandidates.length === 0
  );
  const remainingMinutes =
    availableMinutes -
    maintenanceRecommendations.reduce((sum, recommendation) => sum + recommendation.allocatedMinutes, 0);
  let adjustedMaintenanceRecommendations = maintenanceRecommendations;
  let progressRecommendations = allocateProgressTimeBatched(progressCandidates, remainingMinutes, now);

  if (progressRecommendations.length === 0) {
    const compressedAllocation = allocateProgressWithMaintenanceCompression(
      maintenanceCandidates,
      adjustedMaintenanceRecommendations,
      progressCandidates,
      remainingMinutes,
      now
    );

    if (compressedAllocation) {
      adjustedMaintenanceRecommendations = compressedAllocation.maintenanceRecommendations;
      progressRecommendations = compressedAllocation.progressRecommendations;
    }
  }

  const recommendations = [...adjustedMaintenanceRecommendations, ...progressRecommendations];

  if (recommendations.length === 0) {
    return createShortSessionFallback(groupPriorityBands(candidates)[0] ?? [], availableMinutes, now);
  }

  return recommendations;
}

function allocateProgressWithMaintenanceCompression(
  maintenanceCandidates: ScoredActivity[],
  maintenanceRecommendations: Recommendation[],
  progressCandidates: ScoredActivity[],
  leftoverMinutes: number,
  now: Date
) {
  const progress = groupPriorityBands(progressCandidates).flatMap((band) => sortBandFairly(band, now))[0];

  if (!progress || maintenanceRecommendations.length === 0) {
    return null;
  }

  const progressMinimum = getSessionBounds(progress.activity).minimum;

  if (leftoverMinutes >= progressMinimum) {
    return null;
  }

  if (!canProgressCompressMaintenance(progress)) {
    return null;
  }

  const totalMaintenanceAllocated = maintenanceRecommendations.reduce(
    (sum, recommendation) => sum + recommendation.allocatedMinutes,
    0
  );
  const maxMaintenanceCompression = roundDownToNearestFive(
    totalMaintenanceAllocated * getMaintenanceCompressionRatio(progress)
  );

  if (maxMaintenanceCompression <= 0) {
    return null;
  }

  const extraNeeded = progressMinimum - leftoverMinutes;

  if (extraNeeded > maxMaintenanceCompression) {
    return null;
  }

  const compressedMaintenanceRecommendations = maintenanceRecommendations.map((recommendation) => ({
    ...recommendation
  }));
  const compressedMinutes = compressMaintenanceRecommendations(
    maintenanceCandidates,
    compressedMaintenanceRecommendations,
    extraNeeded,
    now
  );

  if (compressedMinutes < extraNeeded) {
    return null;
  }

  return {
    maintenanceRecommendations: compressedMaintenanceRecommendations,
    progressRecommendations: [
      {
        activity: progress.activity,
        score: progress.score,
        neglect: progress.neglect,
        allocatedMinutes: progressMinimum,
        rationale: progress.rationale
      }
    ]
  };
}

function canProgressCompressMaintenance(progress: ScoredActivity) {
  const importance = getSafeImportance(progress.activity);
  const daysSinceDone = progress.daysSinceLastDone;

  // Recently completed progress should not steal consistency time from
  // maintenance. If it was touched today/yesterday, it can only use natural
  // leftover time.
  if (daysSinceDone <= 1) {
    return false;
  }

  if (importance <= 4 && daysSinceDone < 7) {
    return false;
  }

  if (importance >= 8 && daysSinceDone >= 2) {
    return true;
  }

  if (importance >= 5 && daysSinceDone >= 5) {
    return true;
  }

  return daysSinceDone >= 7;
}

function getMaintenanceCompressionRatio(progress: ScoredActivity) {
  const importance = getSafeImportance(progress.activity);
  const daysSinceDone = progress.daysSinceLastDone;

  // Normal compression is capped at 20% so maintenance remains the default
  // priority. Clearly neglected progress can use a stronger 35% cap.
  if ((daysSinceDone >= 5 && importance >= 8) || (daysSinceDone >= 7 && importance >= 5)) {
    return 0.35;
  }

  return 0.2;
}

function compressMaintenanceRecommendations(
  maintenanceCandidates: ScoredActivity[],
  maintenanceRecommendations: Recommendation[],
  targetCompressionMinutes: number,
  now: Date
) {
  let remainingCompression = targetCompressionMinutes;
  let compressedMinutes = 0;
  const recommendationsByActivityId = new Map(
    maintenanceRecommendations.map((recommendation) => [recommendation.activity.id, recommendation])
  );

  // Controlled maintenance compression only runs when progress would otherwise
  // be starved. It takes time from least-protected maintenance first, while
  // never reducing a maintenance task below its minimum useful session.
  const compressibleCandidates = maintenanceCandidates
    .map((candidate) => {
      const recommendation = recommendationsByActivityId.get(candidate.activity.id);
      const minimum = getSessionBounds(candidate.activity).minimum;
      const reducibleMinutes = recommendation
        ? roundDownToNearestFive(Math.max(0, recommendation.allocatedMinutes - minimum))
        : 0;

      return {
        candidate,
        recommendation,
        minimum,
        reducibleMinutes,
        protectionScore: getMaintenanceProtectionScore(candidate, recommendation, now)
      };
    })
    .filter((item) => item.recommendation && item.reducibleMinutes > 0)
    .sort(
      (left, right) =>
        left.protectionScore - right.protectionScore ||
        left.candidate.score - right.candidate.score ||
        left.candidate.activity.name.localeCompare(right.candidate.activity.name)
    );

  for (const item of compressibleCandidates) {
    if (!item.recommendation || remainingCompression <= 0) {
      break;
    }

    const reduction = Math.min(item.reducibleMinutes, remainingCompression);
    item.recommendation.allocatedMinutes -= reduction;
    remainingCompression -= reduction;
    compressedMinutes += reduction;
  }

  return compressedMinutes;
}

function getMaintenanceProtectionScore(
  candidate: ScoredActivity,
  recommendation: Recommendation | undefined,
  now: Date
) {
  const todayIndex = getTodayIndex(now);
  const { minimum } = getSessionBounds(candidate.activity);
  const allocatedMinutes = recommendation?.allocatedMinutes ?? 0;
  const flexibleMinutes = Math.max(0, allocatedMinutes - minimum);

  return (
    getSafeImportance(candidate.activity) * 10 +
    candidate.neglect +
    candidate.daysSinceLastDone * 5 +
    (candidate.activity.preferredDays?.includes(todayIndex) ? 80 : 0) +
    (candidate.activity.isDaily ? 60 : 0) -
    flexibleMinutes
  );
}

function allocateFairTimeByPriorityBands(
  candidates: ScoredActivity[],
  availableMinutes: number,
  now: Date,
  allowShortFallback: boolean
): Recommendation[] {
  if (candidates.length === 0 || availableMinutes <= 0) {
    return [];
  }

  const bands = groupPriorityBands(candidates);
  const allocations = new Map<string, Recommendation>();
  let remainingMinutes = availableMinutes;

  // Stage 1: scores still decide band order, but equal/near-equal activities receive
  // minimum useful coverage as a group before any one activity is upgraded.
  for (const band of bands) {
    const orderedBand = sortBandFairly(band, now);
    const totalMinimumForBand = orderedBand.reduce(
      (sum, candidate) => sum + getSessionBounds(candidate.activity).minimum,
      0
    );

    if (remainingMinutes >= totalMinimumForBand) {
      for (const candidate of orderedBand) {
        const { minimum } = getSessionBounds(candidate.activity);
        setAllocation(allocations, candidate, minimum);
        remainingMinutes -= minimum;
      }
      continue;
    }

    for (const candidate of orderedBand) {
      const { minimum } = getSessionBounds(candidate.activity);
      if (remainingMinutes >= minimum) {
        setAllocation(allocations, candidate, minimum);
        remainingMinutes -= minimum;
      }
    }
  }

  if (allocations.size === 0) {
    return allowShortFallback ? createShortSessionFallback(bands[0] ?? [], availableMinutes, now) : [];
  }

  // Stage 2: once useful coverage exists, raise selected activities toward ideal
  // with water-filling inside each band so tied activities grow together.
  for (const band of bands) {
    remainingMinutes = distributeWithinBand(
      getSelectedCandidatesForBand(band, allocations, now),
      allocations,
      remainingMinutes,
      (activity) => getSessionBounds(activity).ideal
    );
  }

  return orderRecommendationsByBands(bands, allocations, now);
}

function allocateProgressTimeBatched(
  candidates: ScoredActivity[],
  availableMinutes: number,
  now: Date
): Recommendation[] {
  if (candidates.length === 0 || availableMinutes <= 0) {
    return [];
  }

  const orderedProgress = groupPriorityBands(candidates).flatMap((band) => sortBandFairly(band, now));
  const main = orderedProgress[0];
  const second = orderedProgress[1];

  if (!main) {
    return [];
  }

  const mainBounds = getSessionBounds(main.activity);

  if (availableMinutes < mainBounds.minimum) {
    return [];
  }

  const allocations = new Map<string, Recommendation>();
  let remainingMinutes = availableMinutes;

  // Progress work is intentionally batched: give the strongest stale/important
  // project a real focused block before considering a second project.
  const initialMainAllocation = Math.min(mainBounds.ideal, remainingMinutes);
  setAllocation(allocations, main, initialMainAllocation);
  remainingMinutes -= initialMainAllocation;

  const secondBounds = second ? getSessionBounds(second.activity) : null;
  const shouldAddSecond =
    second &&
    secondBounds &&
    availableMinutes >= Math.max(90, mainBounds.ideal + secondBounds.minimum) &&
    remainingMinutes >= secondBounds.minimum &&
    shouldIncludeSecondProgressActivity(main, second);

  if (shouldAddSecond && second && secondBounds) {
    const secondAllocation = Math.min(secondBounds.ideal, remainingMinutes);
    setAllocation(allocations, second, secondAllocation);
    remainingMinutes -= secondAllocation;
  }

  // Progress activities can use deeper blocks beyond ideal. Any leftover time
  // stays batched into the main project instead of being spread across many items.
  remainingMinutes = increaseAllocationBy(allocations, main, remainingMinutes);

  return orderedProgress
    .slice(0, 2)
    .map((candidate) => allocations.get(candidate.activity.id))
    .filter((recommendation): recommendation is Recommendation => Boolean(recommendation));
}

function groupPriorityBands(candidates: ScoredActivity[]) {
  const bands: ScoredActivity[][] = [];

  for (const candidate of candidates) {
    const currentBand = bands[bands.length - 1];
    const bandLeader = currentBand?.[0];

    if (!currentBand || !bandLeader || !isNearTie(candidate.score, bandLeader.score)) {
      bands.push([candidate]);
    } else {
      currentBand.push(candidate);
    }
  }

  return bands;
}

function isNearTie(score: number, referenceScore: number) {
  const tolerance = Math.max(5, Math.abs(referenceScore) * 0.05);
  return Math.abs(score - referenceScore) <= tolerance;
}

function getRotationScore(activityId: string, now: Date) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const seed = `${activityId}:${startOfToday}`;
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 1000003;
  }

  return hash;
}

function sortBandFairly(band: ScoredActivity[], now: Date) {
  return [...band].sort(
    (left, right) =>
      right.neglect - left.neglect ||
      right.daysSinceLastDone - left.daysSinceLastDone ||
      getRotationScore(left.activity.id, now) - getRotationScore(right.activity.id, now) ||
      left.activity.name.localeCompare(right.activity.name)
  );
}

function setAllocation(
  allocations: Map<string, Recommendation>,
  candidate: ScoredActivity,
  allocatedMinutes: number
) {
  allocations.set(candidate.activity.id, {
    activity: candidate.activity,
    score: candidate.score,
    neglect: candidate.neglect,
    allocatedMinutes,
    rationale: candidate.rationale
  });
}

function getSelectedCandidatesForBand(
  band: ScoredActivity[],
  allocations: Map<string, Recommendation>,
  now: Date
) {
  return sortBandFairly(
    band.filter((candidate) => allocations.has(candidate.activity.id)),
    now
  );
}

function distributeWithinBand(
  band: ScoredActivity[],
  allocations: Map<string, Recommendation>,
  availableMinutes: number,
  getTargetMinutes: (activity: Activity) => number
) {
  let remainingMinutes = availableMinutes;

  while (remainingMinutes > 0) {
    const eligible = band.filter((candidate) => {
      const recommendation = allocations.get(candidate.activity.id);
      return recommendation && recommendation.allocatedMinutes < getTargetMinutes(candidate.activity);
    });

    if (eligible.length === 0) {
      break;
    }

    let usedThisPass = 0;

    eligible.forEach((candidate, index) => {
      const recommendation = allocations.get(candidate.activity.id);
      if (!recommendation || remainingMinutes <= 0) {
        return;
      }

      const remainingEligible = eligible.length - index;
      const fairShare = Math.max(1, Math.floor(remainingMinutes / remainingEligible));
      const target = getTargetMinutes(candidate.activity);
      const increase = Math.min(target - recommendation.allocatedMinutes, fairShare);

      recommendation.allocatedMinutes += increase;
      remainingMinutes -= increase;
      usedThisPass += increase;
    });

    if (usedThisPass === 0) {
      break;
    }
  }

  return remainingMinutes;
}

function increaseAllocationBy(
  allocations: Map<string, Recommendation>,
  candidate: ScoredActivity,
  availableMinutes: number
) {
  const recommendation = allocations.get(candidate.activity.id);

  if (!recommendation || availableMinutes <= 0) {
    return availableMinutes;
  }

  recommendation.allocatedMinutes += availableMinutes;
  return 0;
}

function shouldIncludeSecondProgressActivity(main: ScoredActivity, second: ScoredActivity) {
  const secondImportance = getSafeImportance(second.activity);
  const hasStrongScore = second.score >= main.score * 0.75;
  const hasStaleness = second.daysSinceLastDone >= 4;
  const isHighImportance = secondImportance >= 8;

  return hasStrongScore || hasStaleness || isHighImportance;
}

function createShortSessionFallback(
  topBand: ScoredActivity[],
  availableMinutes: number,
  now: Date
): Recommendation[] {
  const highestPriority = sortBandFairly(topBand, now)[0];

  if (!highestPriority) {
    return [];
  }

  const suggestedDuration = Math.max(1, Math.min(SHORT_SESSION_LIMIT, availableMinutes));

  return [
    {
      activity: highestPriority.activity,
      score: highestPriority.score,
      neglect: highestPriority.neglect,
      allocatedMinutes: suggestedDuration,
      isShortSession: true,
      rationale: `${highestPriority.activity.name} is the best activity to focus on today, even as a shorter session.`
    }
  ];
}

function orderRecommendationsByBands(
  bands: ScoredActivity[][],
  allocations: Map<string, Recommendation>,
  now: Date
) {
  return bands.flatMap((band) =>
    sortBandFairly(band, now)
      .map((candidate) => allocations.get(candidate.activity.id))
      .filter((recommendation): recommendation is Recommendation => Boolean(recommendation))
  );
}

export function getPrioritySummary(recommendations: Recommendation[]) {
  if (recommendations.length === 0) {
    return "No activities have been added yet.";
  }

  if (recommendations.length === 1) {
    if (recommendations[0].isShortSession) {
      return `Best activity to focus on today: ${recommendations[0].activity.name} (${formatMinutes(
        recommendations[0].allocatedMinutes
      )} short session recommended).`;
    }

    return `${recommendations[0].activity.name} is the clearest use of today for ${formatMinutes(
      recommendations[0].allocatedMinutes
    )}.`;
  }

  return `${recommendations[0].activity.name} leads today, with ${recommendations
    .slice(1)
    .map((item) => item.activity.name)
    .join(" and ")} supporting the rest of your time.`;
}
