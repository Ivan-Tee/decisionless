import { Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Card } from "@/components/Card";
import { GhostButton } from "@/components/GhostButton";
import { Screen } from "@/components/Screen";
import { TitleBlock } from "@/components/TitleBlock";
import type { ActivitiesStackParamList } from "@/navigation/TabsNavigator";
import { useActivityStore } from "@/store/activityStore";
import { confirmDestructive } from "@/utils/confirm";
import { weekDays } from "@/utils/date";

type Props = NativeStackScreenProps<ActivitiesStackParamList, "ActivitiesHome">;

export function ActivitiesScreen({ navigation }: Props) {
  const hasHydrated = useActivityStore((state) => state.hasHydrated);
  const activities = useActivityStore((state) => state.activities);
  const deleteActivity = useActivityStore((state) => state.deleteActivity);

  if (!hasHydrated) {
    return (
      <Screen edges={["left", "right", "bottom"]}>
        <View className="flex-1 justify-center">
          <Card>
            <Text className="text-base leading-7 text-mist">Loading activities...</Text>
          </Card>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={["left", "right", "bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 6, paddingBottom: 24, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <TitleBlock
          title="Everything in your current ecosystem"
        />
        <View className="gap-4 pb-8">
          {activities.map((activity) => (
            <Pressable
              key={activity.id}
              onPress={() => navigation.navigate("ActivityDetail", { activityId: activity.id })}
            >
              <Card>
                <View className="gap-4">
                <View className="flex-row items-start justify-between gap-4">
                  <View className="flex-1">
                    <Text className="text-2xl text-ink">{activity.name}</Text>
                    <Text className="mt-1 text-sm uppercase tracking-[2px] text-mist">
                      {activity.type}
                    </Text>
                  </View>
                  <GhostButton
                    label="Remove"
                    onPress={(event) => {
                      event.stopPropagation();
                      confirmDestructive({
                        title: "Remove activity?",
                        message: `${activity.name} will be removed from the app.`,
                        confirmLabel: "Remove",
                        onConfirm: () => deleteActivity(activity.id)
                      });
                    }}
                  />
                </View>
                <Text className="text-base leading-7 text-mist">
                  Minimum session: {activity.minimumSessionMinutes} min
                  {" | "}
                  Ideal: {activity.idealSessionMinutes} min
                  {activity.type === "maintenance" && activity.frequencyPerWeek
                    ? ` | Ideal rhythm: ${activity.frequencyPerWeek}x per week`
                    : ""}
                </Text>
                <View className="gap-3">
                  <Text className="text-sm uppercase tracking-[2px] text-mist">
                    Importance {activity.importance ?? 5}
                  </Text>
                </View>
                {activity.preferredDays?.length ? (
                  <Text className="text-sm leading-6 text-mist">
                    Prefers {activity.preferredDays.map((index) => weekDays[index]).join(", ")}
                  </Text>
                ) : null}
                </View>
              </Card>
            </Pressable>
          ))}
          {activities.length === 0 ? (
            <Card>
              <Text className="text-base leading-7 text-mist">
                No activities yet. Add one to start shaping what deserves attention.
              </Text>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
