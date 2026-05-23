import { ScrollView, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Card } from "@/components/Card";
import { GhostButton } from "@/components/GhostButton";
import { Screen } from "@/components/Screen";
import { useActivityStore } from "@/store/activityStore";
import { formatMinutes, formatShortDate, isSameLocalDay } from "@/utils/date";

export function HistoryScreen() {
  const history = useActivityStore((state) => state.history);
  const restoreCompletedToday = useActivityStore((state) => state.restoreCompletedToday);
  const todaysHistory = history.filter((entry) => isSameLocalDay(entry.completedAt));

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: 6, paddingBottom: 24, gap: 18 }}>
        <View className="gap-4 pb-8">
          {todaysHistory.map((entry) => (
            <Animated.View key={entry.id} entering={FadeIn.duration(160)}>
              <Card>
                <View className="gap-4">
                  <View className="flex-row items-center justify-between gap-4">
                    <View className="flex-1 gap-1">
                      <Text className="text-xl text-ink">{entry.activityName}</Text>
                      <Text className="text-sm text-mist">{formatShortDate(entry.completedAt)}</Text>
                    </View>
                    <Text className="text-base text-mist">{formatMinutes(entry.minutes)}</Text>
                  </View>
                  <GhostButton
                    label="Bring Back"
                    onPress={() => restoreCompletedToday(entry.activityId, entry.id)}
                  />
                </View>
              </Card>
            </Animated.View>
          ))}
          {todaysHistory.length === 0 ? (
            <Card>
              <Text className="text-base leading-7 text-mist">
                Nothing has been logged yet. When you mark a recommendation done, it will appear here.
              </Text>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
