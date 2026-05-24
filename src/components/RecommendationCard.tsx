import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming
} from "react-native-reanimated";
import { Card } from "@/components/Card";
import type { Recommendation } from "@/types/activity";
import { formatMinutes } from "@/utils/date";

type RecommendationCardProps = {
  recommendation: Recommendation;
  onComplete: () => void;
  onOpen: () => void;
  isCompleting?: boolean;
};

export function RecommendationCard({
  recommendation,
  onComplete,
  onOpen,
  isCompleting = false
}: RecommendationCardProps) {
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (!isCompleting) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }

    opacity.value = withDelay(280, withTiming(0, { duration: 260 }));
    translateY.value = withDelay(280, withTiming(-4, { duration: 260 }));
  }, [isCompleting, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }]
  }));

  return (
    <Animated.View entering={FadeIn.duration(160)}>
      <Animated.View style={animatedStyle}>
        <Pressable onPress={onOpen} disabled={isCompleting}>
          <Card
            style={
              isCompleting
                ? {
                    backgroundColor: "#EEF7EE",
                    borderColor: "#D6E8D3"
                  }
                : undefined
            }
          >
            <View className="gap-4">
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1 gap-2">
                  <Text className="text-[28px] leading-8 text-ink">{recommendation.activity.name}</Text>
                  <Text className="text-sm uppercase tracking-[2px] text-mist">
                    {recommendation.activity.type}
                  </Text>
                </View>
                <View className="items-end gap-1">
                  <Text className="text-xl text-ink">{formatMinutes(recommendation.allocatedMinutes)}</Text>
                  {recommendation.isRecommendedBelowMinimum ? (
                    <Text className="text-xs uppercase tracking-[2px] text-mist">(recommended)</Text>
                  ) : null}
                </View>
              </View>
              <Pressable
                disabled={isCompleting}
                onPress={(event) => {
                  event.stopPropagation();
                  onComplete();
                }}
                className="self-start rounded-full border border-line bg-paper px-4 py-3"
              >
                <Text className="text-sm font-medium text-mist">{isCompleting ? "Done" : "Mark done"}</Text>
              </Pressable>
            </View>
          </Card>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}
