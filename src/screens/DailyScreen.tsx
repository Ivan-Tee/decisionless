import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Animated, { FadeIn } from "react-native-reanimated";
import { generateRecommendations } from "@/algorithms/recommendations";
import { Pill } from "@/components/Pill";
import { RecommendationCard } from "@/components/RecommendationCard";
import { Screen } from "@/components/Screen";
import { TitleBlock } from "@/components/TitleBlock";
import type { TodayStackParamList } from "@/navigation/TabsNavigator";
import { useActivityStore } from "@/store/activityStore";
import { centeredInputTextRegular } from "@/theme/inputStyles";
import type { Recommendation, TodayPlan } from "@/types/activity";
import { formatMinutes, getLocalDateKey, isSameLocalDay } from "@/utils/date";

const presets = [30, 60, 120, 240];

type Props = NativeStackScreenProps<TodayStackParamList, "TodayHome">;

export function DailyScreen({ navigation }: Props) {
  const activities = useActivityStore((state) => state.activities);
  const history = useActivityStore((state) => state.history);
  const todayPlan = useActivityStore((state) => state.todayPlan);
  const activityPlanVersion = useActivityStore((state) => state.activityPlanVersion);
  const dailyAvailableMinutes = useActivityStore((state) => state.dailyAvailableMinutes);
  const setDailyAvailableMinutes = useActivityStore((state) => state.setDailyAvailableMinutes);
  const setTodayPlan = useActivityStore((state) => state.setTodayPlan);
  const markCompletedToday = useActivityStore((state) => state.markCompletedToday);
  const [customMinutes, setCustomMinutes] = useState(
    dailyAvailableMinutes > 0 ? String(dailyAvailableMinutes) : ""
  );
  const [isEditingCustomMinutes, setIsEditingCustomMinutes] = useState(false);
  const [completingActivityIds, setCompletingActivityIds] = useState<string[]>([]);
  const completionTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (isEditingCustomMinutes) {
      return;
    }

    setCustomMinutes(dailyAvailableMinutes > 0 ? String(dailyAvailableMinutes) : "");
  }, [dailyAvailableMinutes, isEditingCustomMinutes]);

  const commitCustomMinutes = () => {
    const minutes = customMinutes.trim() ? Number(customMinutes) : 0;
    setDailyAvailableMinutes(Number.isFinite(minutes) ? minutes : 0);
    setIsEditingCustomMinutes(false);
  };

  const hasUsableTime = dailyAvailableMinutes > 0;
  const todayDateKey = getLocalDateKey();
  const completedTodayActivityIds = useMemo(
    () =>
      new Set(
        history
          .filter((entry) => isSameLocalDay(entry.completedAt))
          .map((entry) => entry.activityId)
      ),
    [history]
  );
  const planNeedsRefresh =
    hasUsableTime &&
    (!todayPlan ||
      todayPlan.dateKey !== todayDateKey ||
      todayPlan.availableMinutes !== dailyAvailableMinutes ||
      todayPlan.activityPlanVersion !== activityPlanVersion);

  useEffect(() => {
    if (!hasUsableTime) {
      if (todayPlan) {
        setTodayPlan(null);
      }
      return;
    }

    if (!planNeedsRefresh) {
      return;
    }

    const unfinishedActivities = activities.filter((activity) => !completedTodayActivityIds.has(activity.id));
    const plannedRecommendations = generateRecommendations(unfinishedActivities, dailyAvailableMinutes);
    const nextPlan: TodayPlan = {
      dateKey: todayDateKey,
      availableMinutes: dailyAvailableMinutes,
      activityPlanVersion,
      items: plannedRecommendations.map((recommendation) => ({
        activityId: recommendation.activity.id,
        score: recommendation.score,
        neglect: recommendation.neglect,
        allocatedMinutes: recommendation.allocatedMinutes,
        isShortSession: recommendation.isShortSession,
        rationale: recommendation.rationale
      }))
    };

    setTodayPlan(nextPlan);
  }, [
    activities,
    activityPlanVersion,
    completedTodayActivityIds,
    dailyAvailableMinutes,
    hasUsableTime,
    planNeedsRefresh,
    setTodayPlan,
    todayPlan,
    todayDateKey
  ]);

  const recommendations = useMemo<Recommendation[]>(() => {
    if (!todayPlan || planNeedsRefresh) {
      return [];
    }

    return todayPlan.items.reduce<Recommendation[]>((currentRecommendations, item) => {
      if (item.completedAt || completingActivityIds.includes(item.activityId)) {
        return currentRecommendations;
      }

      const activity = activities.find((candidate) => candidate.id === item.activityId);

      if (!activity) {
        return currentRecommendations;
      }

      currentRecommendations.push({
        activity,
        score: item.score,
        neglect: item.neglect,
        allocatedMinutes: item.allocatedMinutes,
        ...(item.isShortSession ? { isShortSession: item.isShortSession } : {}),
        rationale: item.rationale
      });

      return currentRecommendations;
    }, []);
  }, [activities, completingActivityIds, planNeedsRefresh, todayPlan]);
  const remainingPlannedMinutes = recommendations.reduce(
    (sum, recommendation) => sum + recommendation.allocatedMinutes,
    0
  );
  const hasCompletedPlan =
    Boolean(todayPlan && !planNeedsRefresh && todayPlan.items.length > 0) && recommendations.length === 0;

  useEffect(() => {
    const timers = completionTimers.current;

    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const completeRecommendation = (activityId: string, minutes: number) => {
    if (completingActivityIds.includes(activityId) || completionTimers.current[activityId]) {
      return;
    }

    setCompletingActivityIds((current) => [...current, activityId]);
    completionTimers.current[activityId] = setTimeout(() => {
      markCompletedToday(activityId, minutes);
      delete completionTimers.current[activityId];
      setCompletingActivityIds((current) => current.filter((id) => id !== activityId));
    }, 620);
  };

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 6, paddingBottom: 24, gap: 28 }}
        showsVerticalScrollIndicator={false}
      >
        <TitleBlock
          title="How much usable time do you have today?"
          description="This is not a schedule. It is a recommendation for where today's attention could land best."
        />

        <Animated.View
          entering={FadeIn.duration(180)}
          className="gap-4 rounded-[30px] border border-line bg-card p-6"
        >
          <View className="flex-row flex-wrap gap-3">
            {presets.map((preset) => (
              <Pill
                key={preset}
                label={preset < 60 ? `${preset}m` : `${preset / 60}h`}
                active={dailyAvailableMinutes === preset}
            onPress={() => {
              setIsEditingCustomMinutes(false);
              setCustomMinutes(String(preset));
              setDailyAvailableMinutes(preset);
            }}
              />
            ))}
          </View>
          <TextInput
            keyboardType="number-pad"
            value={customMinutes}
            style={centeredInputTextRegular}
            onFocus={() => setIsEditingCustomMinutes(true)}
            onBlur={commitCustomMinutes}
            onSubmitEditing={commitCustomMinutes}
            onChangeText={(value) => {
              const digits = value.replace(/\D/g, "");
              setCustomMinutes(digits);
            }}
            placeholder="Custom minutes"
            placeholderTextColor="#9A9288"
            className="mt-6 rounded-[24px] border border-line bg-paper px-5 py-4 text-lg text-ink"
          />
        </Animated.View>

        <View className="gap-3">
          <Text className="text-base uppercase tracking-[3px] text-mist">Best use of today</Text>
          <Text className="text-base text-mist">
            Time in play: {formatMinutes(remainingPlannedMinutes)}
          </Text>
        </View>

        <View className="gap-4 pb-8">
          {recommendations.length > 0 ? (
            recommendations.map((recommendation) => (
              <RecommendationCard
                key={recommendation.activity.id}
                recommendation={recommendation}
                isCompleting={completingActivityIds.includes(recommendation.activity.id)}
                onOpen={() =>
                  navigation.navigate("ActivityDetail", {
                    activityId: recommendation.activity.id
                  })
                }
                onComplete={() =>
                  completeRecommendation(recommendation.activity.id, recommendation.allocatedMinutes)
                }
              />
            ))
          ) : (
            <View className="rounded-[30px] border border-dashed border-line bg-card p-6">
              <Text className="text-base leading-7 text-mist">
                {hasCompletedPlan
                  ? "Everything in the original plan has been completed for today."
                  : hasUsableTime
                    ? "Add one activity and this space will start recommending what deserves attention."
                    : "Set usable time for today to see recommendations."}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
