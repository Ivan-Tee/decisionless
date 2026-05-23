import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { Alert, ScrollView, Text, TextInput, View } from "react-native";
import { GhostButton } from "@/components/GhostButton";
import { Pill } from "@/components/Pill";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { TitleBlock } from "@/components/TitleBlock";
import type { ActivitiesStackParamList, TodayStackParamList } from "@/navigation/TabsNavigator";
import { useActivityStore } from "@/store/activityStore";
import { centeredInputTextRegular } from "@/theme/inputStyles";
import type { Activity, ActivityKind } from "@/types/activity";
import { weekDays } from "@/utils/date";
import { formatSessionInput, parseSessionMinutesInput } from "@/utils/inputParsers";

type TodayProps = NativeStackScreenProps<TodayStackParamList, "ActivityDetail">;
type ActivitiesProps = NativeStackScreenProps<ActivitiesStackParamList, "ActivityDetail">;
type Props = TodayProps | ActivitiesProps;

type EditDraft = {
  name: string;
  type: ActivityKind;
  importance: number;
  frequencyPerWeek: number | null;
  hasNoRhythm: boolean;
  preferredDays: number[];
  minimumSessionMinutes: string;
  idealSessionMinutes: string;
  lastCompleted: string;
};

const frequencyOptions = [1, 2, 3, 4, 5, 6, 7];
const sessionOptions = [5, 15, 20, 30, 45, 60, 90];
const importanceOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function toDateInputValue(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function createDraft(activity: Activity): EditDraft {
  return {
    name: activity.name,
    type: activity.type,
    importance: activity.importance ?? 5,
    frequencyPerWeek: activity.type === "maintenance" && !activity.hasNoRhythm ? activity.frequencyPerWeek ?? 1 : null,
    hasNoRhythm: Boolean(activity.hasNoRhythm),
    preferredDays: activity.preferredDays ?? [],
    minimumSessionMinutes: formatSessionInput(activity.minimumSessionMinutes),
    idealSessionMinutes: formatSessionInput(activity.idealSessionMinutes),
    lastCompleted: toDateInputValue(activity.lastCompleted)
  };
}

function parseDateInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return new Date().toISOString();
  }

  const date = new Date(`${trimmed}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function ActivityEditScreen({ navigation, route }: Props) {
  const activity = useActivityStore((state) =>
    state.activities.find((item) => item.id === route.params.activityId)
  );
  const updateActivity = useActivityStore((state) => state.updateActivity);
  const [draft, setDraft] = useState<EditDraft | null>(() =>
    activity ? createDraft(activity) : null
  );

  const validationError = useMemo(() => {
    if (!draft) {
      return "Activity not found.";
    }

    if (!draft.name.trim()) {
      return "Activity name is required.";
    }

    if (draft.importance < 1 || draft.importance > 10) {
      return "Importance must be between 1 and 10.";
    }

    if (draft.type !== "maintenance" && draft.type !== "progress") {
      return "Choose a valid activity type.";
    }

    if (draft.type === "maintenance" && !draft.hasNoRhythm && !draft.frequencyPerWeek) {
      return "Maintenance activities need a rhythm.";
    }

    const minimumSessionMinutes = parseSessionMinutesInput(draft.minimumSessionMinutes);
    if (!minimumSessionMinutes || minimumSessionMinutes <= 0) {
      return "Minimum session must be a positive number.";
    }

    const idealSessionMinutes = parseSessionMinutesInput(draft.idealSessionMinutes);
    if (!idealSessionMinutes || idealSessionMinutes < minimumSessionMinutes) {
      return "Ideal session must be at least the minimum session.";
    }

    if (!parseDateInput(draft.lastCompleted)) {
      return "Last done date must use YYYY-MM-DD.";
    }

    return null;
  }, [draft]);

  if (!activity || !draft) {
    return (
      <Screen>
        <View className="flex-1 justify-center gap-6">
          <TitleBlock title="Activity not found." description="This activity may have been removed." />
          <GhostButton label="Go back" onPress={() => navigation.goBack()} />
        </View>
      </Screen>
    );
  }

  const toggleDay = (dayIndex: number) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        preferredDays: current.preferredDays.includes(dayIndex)
          ? current.preferredDays.filter((item) => item !== dayIndex)
          : [...current.preferredDays, dayIndex]
      };
    });
  };

  const saveChanges = () => {
    if (validationError || !draft) {
      Alert.alert("Check the details", validationError ?? "Something needs attention.");
      return;
    }

    const lastCompleted = parseDateInput(draft.lastCompleted);
    if (!lastCompleted) {
      Alert.alert("Check the date", "Last done date must use YYYY-MM-DD.");
      return;
    }

    const minimumSessionMinutes = parseSessionMinutesInput(draft.minimumSessionMinutes);
    const idealSessionMinutes = parseSessionMinutesInput(draft.idealSessionMinutes);

    if (!minimumSessionMinutes || !idealSessionMinutes) {
      Alert.alert("Check the session times", "Session lengths need to use minutes or hours.");
      return;
    }

    updateActivity(activity.id, {
      id: activity.id,
      name: draft.name.trim(),
      type: draft.type,
      importance: draft.importance,
      lastCompleted,
      minimumSessionMinutes,
      idealSessionMinutes,
      preferredDays: draft.preferredDays.length > 0 ? draft.preferredDays : undefined,
      frequencyPerWeek:
        draft.type === "maintenance" && !draft.hasNoRhythm ? draft.frequencyPerWeek ?? 1 : undefined,
      isDaily: draft.type === "maintenance" && !draft.hasNoRhythm && (draft.frequencyPerWeek ?? 0) >= 7,
      hasNoRhythm: draft.type === "maintenance" ? draft.hasNoRhythm : false
    });
    navigation.goBack();
  };

  return (
    <Screen>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingVertical: 24, gap: 24 }}>
        <TitleBlock
          eyebrow="Edit activity"
          title={activity.name}
          description="Changes stay here until you save."
        />

        <View className="gap-4">
          <Text className="text-sm uppercase tracking-[2px] text-mist">Name</Text>
          <TextInput
            value={draft.name}
            style={centeredInputTextRegular}
            onChangeText={(value) => setDraft((current) => current && { ...current, name: value })}
            placeholder="Activity name"
            placeholderTextColor="#9A9288"
            className="rounded-[24px] border border-line bg-card px-5 py-4 text-lg text-ink"
          />
        </View>

        <View className="gap-3">
          <Text className="text-sm uppercase tracking-[2px] text-mist">Type</Text>
          <View className="flex-row flex-wrap gap-3">
            <Pill
              label="Maintenance"
              active={draft.type === "maintenance"}
              onPress={() =>
                setDraft((current) =>
                  current && {
                    ...current,
                    type: "maintenance",
                    frequencyPerWeek: current.frequencyPerWeek ?? 1,
                    hasNoRhythm: current.hasNoRhythm
                  }
                )
              }
            />
            <Pill
              label="Progress"
              active={draft.type === "progress"}
              onPress={() =>
                setDraft((current) =>
                  current && {
                    ...current,
                    type: "progress",
                    frequencyPerWeek: null,
                    hasNoRhythm: false
                  }
                )
              }
            />
          </View>
        </View>

        <View className="gap-3">
          <Text className="text-sm uppercase tracking-[2px] text-mist">
            Importance {draft.importance}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {importanceOptions.map((value) => (
              <Pill
                key={value}
                label={String(value)}
                active={draft.importance === value}
                onPress={() => setDraft((current) => current && { ...current, importance: value })}
              />
            ))}
          </View>
        </View>

        {draft.type === "maintenance" ? (
          <View className="gap-3">
            <Text className="text-sm uppercase tracking-[2px] text-mist">Weekly rhythm</Text>
            <View className="flex-row flex-wrap gap-2">
              <Pill
                label="None"
                active={draft.hasNoRhythm}
                onPress={() =>
                  setDraft((current) =>
                    current && {
                      ...current,
                      frequencyPerWeek: null,
                      hasNoRhythm: true
                    }
                  )
                }
              />
              {frequencyOptions.map((value) => (
                <Pill
                  key={value}
                  label={`${value}x / week`}
                  active={!draft.hasNoRhythm && draft.frequencyPerWeek === value}
                  onPress={() =>
                    setDraft(
                      (current) =>
                        current && {
                          ...current,
                          frequencyPerWeek: value,
                          hasNoRhythm: false
                        }
                    )
                  }
                />
              ))}
            </View>
          </View>
        ) : null}

        <View className="gap-3">
          <Text className="text-sm uppercase tracking-[2px] text-mist">Preferred days</Text>
          <View className="flex-row flex-wrap gap-2">
            {weekDays.map((day, index) => (
              <Pill
                key={day}
                label={day}
                active={draft.preferredDays.includes(index)}
                onPress={() => toggleDay(index)}
              />
            ))}
          </View>
        </View>

        <View className="gap-3">
          <Text className="text-sm uppercase tracking-[2px] text-mist">Minimum useful session</Text>
          <View className="flex-row flex-wrap gap-2">
            {sessionOptions.map((value) => (
              <Pill
                key={value}
                label={`${value} min`}
                active={parseSessionMinutesInput(draft.minimumSessionMinutes) === value}
                onPress={() =>
                  setDraft((current) =>
                    current && {
                      ...current,
                      minimumSessionMinutes: formatSessionInput(value),
                      idealSessionMinutes:
                        (parseSessionMinutesInput(current.idealSessionMinutes) ?? 0) >= value
                          ? current.idealSessionMinutes
                          : ""
                    }
                  )
                }
              />
            ))}
          </View>
          <TextInput
            value={draft.minimumSessionMinutes}
            style={centeredInputTextRegular}
            onChangeText={(value) =>
              setDraft((current) =>
                current && { ...current, minimumSessionMinutes: value }
              )
            }
            placeholder="Custom time, e.g. 25 min or 1h 40m"
            placeholderTextColor="#9A9288"
            className="rounded-[24px] border border-line bg-card px-5 py-4 text-lg text-ink"
          />
        </View>

        <View className="gap-3">
          <Text className="text-sm uppercase tracking-[2px] text-mist">Ideal session</Text>
          <View className="flex-row flex-wrap gap-2">
            {sessionOptions.map((value) => (
              <Pill
                key={value}
                label={`${value} min`}
                active={parseSessionMinutesInput(draft.idealSessionMinutes) === value}
                onPress={() =>
                  setDraft((current) =>
                    current && {
                      ...current,
                      idealSessionMinutes: formatSessionInput(value)
                    }
                  )
                }
              />
            ))}
          </View>
          <TextInput
            value={draft.idealSessionMinutes}
            style={centeredInputTextRegular}
            onChangeText={(value) =>
              setDraft((current) =>
                current && { ...current, idealSessionMinutes: value }
              )
            }
            placeholder="Custom time, e.g. 45 min or 2h"
            placeholderTextColor="#9A9288"
            className="rounded-[24px] border border-line bg-card px-5 py-4 text-lg text-ink"
          />
        </View>

        <View className="gap-3">
          <Text className="text-sm uppercase tracking-[2px] text-mist">Last done date</Text>
          <TextInput
            value={draft.lastCompleted}
            style={centeredInputTextRegular}
            onChangeText={(value) => setDraft((current) => current && { ...current, lastCompleted: value })}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9A9288"
            className="rounded-[24px] border border-line bg-card px-5 py-4 text-lg text-ink"
          />
        </View>

        {validationError ? (
          <Text className="text-sm leading-6 text-mist">{validationError}</Text>
        ) : null}

        <View className="gap-3 pb-8">
          <PrimaryButton label="Save changes" onPress={saveChanges} disabled={Boolean(validationError)} />
          <GhostButton label="Cancel" onPress={() => navigation.goBack()} />
        </View>
      </ScrollView>
    </Screen>
  );
}
