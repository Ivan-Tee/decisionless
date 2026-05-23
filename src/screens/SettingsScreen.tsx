import { ScrollView, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { GhostButton } from "@/components/GhostButton";
import { Screen } from "@/components/Screen";
import { useActivityStore } from "@/store/activityStore";
import { confirmDestructive } from "@/utils/confirm";

export function SettingsScreen() {
  const startOver = useActivityStore((state) => state.startOver);

  return (
    <Screen>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingVertical: 24, gap: 24 }}>
        <Card>
          <View className="gap-4">
            <Text className="text-2xl text-ink">Reset everything</Text>
            <Text className="text-base leading-7 text-mist">
              This clears activities, importance scores, and history so you can start fresh.
            </Text>
            <GhostButton
              label="Start over"
              onPress={() =>
                confirmDestructive({
                  title: "Start over?",
                  message: "This will clear the whole app.",
                  confirmLabel: "Reset",
                  onConfirm: startOver
                })
              }
            />
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}
