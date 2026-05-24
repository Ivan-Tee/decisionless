import { useState } from "react";
import { Platform, ScrollView, Text, TextInput, View } from "react-native";
import { Card } from "@/components/Card";
import { GhostButton } from "@/components/GhostButton";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { useActivityStore } from "@/store/activityStore";
import { centeredInputTextRegular } from "@/theme/inputStyles";
import { confirmDestructive } from "@/utils/confirm";
import { formatMinutes } from "@/utils/date";
import { calculateGoogleCalendarFreeMinutes, getWindowDates } from "@/utils/googleCalendar";

export function SettingsScreen() {
  const startOver = useActivityStore((state) => state.startOver);
  const setDailyAvailableMinutes = useActivityStore((state) => state.setDailyAvailableMinutes);
  const [isCalendarFlowOpen, setIsCalendarFlowOpen] = useState(false);
  const [calendarStartTime, setCalendarStartTime] = useState("07:00");
  const [calendarEndTime, setCalendarEndTime] = useState("22:30");
  const [calendarError, setCalendarError] = useState("");
  const [isCalculatingCalendarTime, setIsCalculatingCalendarTime] = useState(false);
  const [calculatedCalendarMinutes, setCalculatedCalendarMinutes] = useState<number | null>(null);

  const closeCalendarFlow = () => {
    setIsCalendarFlowOpen(false);
    setCalendarError("");
    setCalculatedCalendarMinutes(null);
    setIsCalculatingCalendarTime(false);
  };

  const calculateCalendarTime = async () => {
    setCalendarError("");
    setCalculatedCalendarMinutes(null);

    if (!getWindowDates(calendarStartTime, calendarEndTime)) {
      setCalendarError("Enter a valid start and end time, with start before end.");
      return;
    }

    if (Platform.OS !== "web") {
      setCalendarError("Google Calendar calculation is available in the web version.");
      return;
    }

    const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

    if (!googleClientId) {
      setCalendarError("Google Calendar is not configured yet. Manual time entry is still available.");
      return;
    }

    setIsCalculatingCalendarTime(true);

    try {
      const freeMinutes = await calculateGoogleCalendarFreeMinutes(
        googleClientId,
        calendarStartTime,
        calendarEndTime
      );
      setCalculatedCalendarMinutes(freeMinutes);
    } catch (error) {
      setCalendarError(error instanceof Error ? error.message : "Google Calendar could not be read.");
    } finally {
      setIsCalculatingCalendarTime(false);
    }
  };

  const useCalculatedTime = () => {
    if (calculatedCalendarMinutes === null) {
      return;
    }

    setDailyAvailableMinutes(calculatedCalendarMinutes, "google_calendar");
    closeCalendarFlow();
  };

  return (
    <Screen>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingVertical: 24, gap: 24 }}>
        <Card>
          <View className="gap-4">
            <Text className="text-2xl text-ink">Calendar free time</Text>
            <Text className="text-base leading-7 text-mist">
              Optionally calculate today's free time from Google Calendar. Event details are not saved.
            </Text>
            {!isCalendarFlowOpen ? (
              <GhostButton
                label="Calculate free time from Google Calendar"
                onPress={() => {
                  setIsCalendarFlowOpen(true);
                  setCalendarError("");
                  setCalculatedCalendarMinutes(null);
                }}
              />
            ) : (
              <View className="gap-4">
                <View className="gap-3">
                  <Text className="text-sm uppercase tracking-[2px] text-mist">Available day window</Text>
                  <View className="gap-3">
                    <TextInput
                      value={calendarStartTime}
                      style={centeredInputTextRegular}
                      onChangeText={setCalendarStartTime}
                      placeholder="07:00"
                      placeholderTextColor="#9A9288"
                      className="rounded-[24px] border border-line bg-paper px-5 py-4 text-lg text-ink"
                    />
                    <TextInput
                      value={calendarEndTime}
                      style={centeredInputTextRegular}
                      onChangeText={setCalendarEndTime}
                      placeholder="22:30"
                      placeholderTextColor="#9A9288"
                      className="rounded-[24px] border border-line bg-paper px-5 py-4 text-lg text-ink"
                    />
                  </View>
                </View>
                {calendarError ? (
                  <Text className="text-sm leading-6 text-mist">{calendarError}</Text>
                ) : null}
                {calculatedCalendarMinutes !== null ? (
                  <Text className="text-base leading-7 text-ink">
                    Free time found today:{" "}
                    {calculatedCalendarMinutes === 0 ? "0 minutes" : formatMinutes(calculatedCalendarMinutes)}
                  </Text>
                ) : null}
                {calculatedCalendarMinutes === null ? (
                  <PrimaryButton
                    label={isCalculatingCalendarTime ? "Reading calendar..." : "Connect Google Calendar"}
                    onPress={calculateCalendarTime}
                    disabled={isCalculatingCalendarTime}
                  />
                ) : (
                  <PrimaryButton label="Use this time for today" onPress={useCalculatedTime} />
                )}
                <GhostButton label="Cancel" onPress={closeCalendarFlow} />
              </View>
            )}
          </View>
        </Card>
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
