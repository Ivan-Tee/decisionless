import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { ActivityTypeCard } from "@/components/ActivityTypeCard";
import { GhostButton } from "@/components/GhostButton";
import { Pill } from "@/components/Pill";
import { PrimaryButton } from "@/components/PrimaryButton";
import { QuestionScaffold } from "@/components/QuestionScaffold";
import type { RootStackParamList } from "@/navigation/RootNavigator";
import type { ActivitiesStackParamList } from "@/navigation/TabsNavigator";
import { useActivityStore } from "@/store/activityStore";
import { centeredInputTextLarge } from "@/theme/inputStyles";
import type { Activity, ActivityDraft, ActivityKind } from "@/types/activity";
import { weekDays } from "@/utils/date";
import {
  formatFrequencyInput,
  formatSessionInput,
  parseSessionMinutesInput
} from "@/utils/inputParsers";

type RootProps = NativeStackScreenProps<RootStackParamList, "ActivityCreation">;
type TabProps = NativeStackScreenProps<ActivitiesStackParamList, "AddActivity">;
type Props = RootProps | TabProps;

type Step =
  | "name"
  | "type"
  | "importance"
  | "frequency"
  | "days"
  | "minimum"
  | "ideal"
  | "review";

const defaultDraft: ActivityDraft = {
  name: "",
  type: null,
  importance: null,
  frequencyPerWeek: null,
  minimumSessionMinutes: null,
  idealSessionMinutes: null,
  preferredDays: [],
  hasNoRhythm: false
};

function isRootProps(props: Props): props is RootProps {
  return props.route.name === "ActivityCreation";
}

function createActivity(draft: ActivityDraft): Activity {
  const minimumSessionMinutes = draft.minimumSessionMinutes ?? 20;
  const idealSessionMinutes =
    draft.idealSessionMinutes ?? Math.max(Math.round(minimumSessionMinutes * 1.5), minimumSessionMinutes);

  return {
    id: `${draft.name}-${Date.now()}`,
    name: draft.name.trim(),
    type: draft.type ?? "progress",
    importance: draft.importance ?? 5,
    lastCompleted: new Date().toISOString(),
    minimumSessionMinutes,
    idealSessionMinutes,
    preferredDays: draft.preferredDays.length > 0 ? draft.preferredDays : undefined,
    frequencyPerWeek:
      draft.type === "maintenance" && !draft.hasNoRhythm ? draft.frequencyPerWeek ?? 1 : undefined,
    isDaily: draft.type === "maintenance" && !draft.hasNoRhythm && (draft.frequencyPerWeek ?? 0) >= 7,
    hasNoRhythm: draft.type === "maintenance" ? draft.hasNoRhythm : false
  };
}

export function ActivityCreationScreen(props: Props) {
  const activities = useActivityStore((state) => state.activities);
  const addActivity = useActivityStore((state) => state.addActivity);
  const completeOnboarding = useActivityStore((state) => state.completeOnboarding);
  const [step, setStep] = useState<Step>("name");
  const [draft, setDraft] = useState<ActivityDraft>(defaultDraft);
  const [minimumInput, setMinimumInput] = useState("");
  const [idealInput, setIdealInput] = useState("");

  const isOnboarding = isRootProps(props);
  const getPreviousStep = (currentStep: Step): Step | null => {
    switch (currentStep) {
      case "type":
        return "name";
      case "importance":
        return "type";
      case "frequency":
        return "importance";
      case "days":
        return draft.type === "maintenance" ? "frequency" : "importance";
      case "minimum":
        return "days";
      case "ideal":
        return "minimum";
      default:
        return null;
    }
  };
  const previousStep = getPreviousStep(step);
  const goToPreviousStep = previousStep ? () => setStep(previousStep) : undefined;

  const canSave = useMemo(() => {
    if (
      !draft.name.trim() ||
      !draft.minimumSessionMinutes ||
      !draft.idealSessionMinutes ||
      !draft.importance ||
      !draft.type
    ) {
      return false;
    }

    if (draft.type === "maintenance" && !draft.hasNoRhythm && !draft.frequencyPerWeek) {
      return false;
    }

    return (
      draft.minimumSessionMinutes > 0 &&
      draft.idealSessionMinutes >= draft.minimumSessionMinutes
    );
  }, [draft]);

  const saveActivity = () => {
    if (!canSave) {
      return;
    }

    addActivity(createActivity(draft));

    if (isOnboarding) {
      setDraft(defaultDraft);
      setMinimumInput("");
      setIdealInput("");
      setStep("review");
      return;
    }

    Alert.alert("Saved", "Your activity has been added.");
    props.navigation.goBack();
  };

  const toggleDay = (dayIndex: number) => {
    setDraft((current) => ({
      ...current,
      preferredDays: current.preferredDays.includes(dayIndex)
        ? current.preferredDays.filter((item) => item !== dayIndex)
        : [...current.preferredDays, dayIndex]
    }));
  };

  const chooseType = (type: ActivityKind) => {
    setDraft((current) => ({
      ...current,
      type,
      frequencyPerWeek: type === "progress" ? null : current.frequencyPerWeek,
      hasNoRhythm: type === "progress" ? false : current.hasNoRhythm
    }));
    setStep("importance");
  };

  if (step === "name") {
    return (
      <QuestionScaffold eyebrow="Activity setup" title="What is the activity called?">
        <TextInput
          value={draft.name}
          style={centeredInputTextLarge}
          onChangeText={(value) => setDraft((current) => ({ ...current, name: value }))}
          placeholder="Sport, Reading, Project..."
          placeholderTextColor="#9A9288"
          className="rounded-[24px] border border-line bg-paper px-5 py-5 text-xl text-ink"
        />
        <PrimaryButton
          label="Continue"
          onPress={() => setStep("type")}
          disabled={!draft.name.trim()}
        />
      </QuestionScaffold>
    );
  }

  if (step === "type") {
    return (
      <QuestionScaffold
        eyebrow="Activity setup"
        title="Is this a Maintenance activity or a Progress activity?"
        onBack={goToPreviousStep}
      >
        <View className="gap-4">
          <ActivityTypeCard
            title="Maintenance"
            description="Things like language practice or sport that require consistency for the best results."
            onPress={() => chooseType("maintenance")}
          />
          <ActivityTypeCard
            title="Progress"
            description="Things like projects or coding that require deeper work and can be done in focused blocks for the best results."
            onPress={() => chooseType("progress")}
          />
        </View>
      </QuestionScaffold>
    );
  }

  if (step === "importance") {
    return (
      <QuestionScaffold
        eyebrow="Activity setup"
        title="How important is this activity compared to your other activities?"
        description="10 means this is one of your most important activities."
        onBack={goToPreviousStep}
      >
        <View className="flex-row flex-wrap gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
            <Pill
              key={value}
              label={String(value)}
              active={draft.importance === value}
              onPress={() => setDraft((current) => ({ ...current, importance: value }))}
            />
          ))}
        </View>
        <PrimaryButton
          label="Continue"
          onPress={() => setStep(draft.type === "maintenance" ? "frequency" : "days")}
          disabled={!draft.importance}
        />
      </QuestionScaffold>
    );
  }

  if (step === "frequency") {
    return (
      <QuestionScaffold
        eyebrow="Activity setup"
        title="Does this need a regular rhythm?"
        description="Choose the rhythm you want, or keep it fully flexible."
        onBack={goToPreviousStep}
      >
        <View className="flex-row flex-wrap gap-3">
          <Pill
            label="None"
            active={draft.hasNoRhythm}
            onPress={() => {
              setDraft((current) => ({
                ...current,
                frequencyPerWeek: null,
                hasNoRhythm: true
              }));
            }}
          />
          {[1, 2, 3, 4, 5, 6, 7].map((value) => (
            <Pill
              key={value}
              label={`${value}x / week`}
              active={!draft.hasNoRhythm && draft.frequencyPerWeek === value}
              onPress={() => {
                setDraft((current) => ({
                  ...current,
                  frequencyPerWeek: value,
                  hasNoRhythm: false
                }));
              }}
            />
          ))}
        </View>
        <PrimaryButton
          label="Continue"
          onPress={() => setStep("days")}
          disabled={!draft.hasNoRhythm && !draft.frequencyPerWeek}
        />
      </QuestionScaffold>
    );
  }

  if (step === "days") {
    return (
      <QuestionScaffold
        eyebrow="Activity setup"
        title="Are there preferred days?"
        onBack={goToPreviousStep}
      >
        <View className="flex-row flex-wrap gap-3">
          {weekDays.map((day, index) => (
            <Pill
              key={day}
              label={day}
              active={draft.preferredDays.includes(index)}
              onPress={() => toggleDay(index)}
            />
          ))}
        </View>
        <PrimaryButton label="Continue" onPress={() => setStep("minimum")} />
      </QuestionScaffold>
    );
  }

  if (step === "minimum") {
    return (
      <QuestionScaffold
        eyebrow="Activity setup"
        title="What is the minimum useful session length?"
        description="This helps the app avoid fragmenting your day into tiny, unrealistic suggestions."
        onBack={goToPreviousStep}
      >
        <View className="flex-row flex-wrap gap-3">
          {[5, 15, 20, 30, 45, 60, 90].map((value) => (
            <Pill
              key={value}
              label={`${value} min`}
              active={draft.minimumSessionMinutes === value}
              onPress={() => {
                setMinimumInput(formatSessionInput(value));
                setDraft((current) => ({
                  ...current,
                  minimumSessionMinutes: value,
                  idealSessionMinutes:
                    current.idealSessionMinutes && current.idealSessionMinutes >= value
                      ? current.idealSessionMinutes
                      : null
                }));
              }}
            />
          ))}
        </View>
        <TextInput
          value={minimumInput}
          style={centeredInputTextLarge}
          onChangeText={(value) => {
            const parsed = parseSessionMinutesInput(value);
            setMinimumInput(value);
            setDraft((current) => ({
              ...current,
              minimumSessionMinutes: parsed,
              idealSessionMinutes:
                parsed && current.idealSessionMinutes && current.idealSessionMinutes >= parsed
                  ? current.idealSessionMinutes
                  : null
            }));
          }}
          placeholder="Custom time, e.g. 25 min or 1h 40m"
          placeholderTextColor="#9A9288"
          className="rounded-[24px] border border-line bg-paper px-5 py-5 text-xl text-ink"
        />
        {minimumInput.trim() && !draft.minimumSessionMinutes ? (
          <Text className="text-sm leading-6 text-mist">Use minutes or hours, like 25 min, 1h 40m, or 3h.</Text>
        ) : null}
        <PrimaryButton
          label="Continue"
          onPress={() => setStep("ideal")}
          disabled={!draft.minimumSessionMinutes}
        />
      </QuestionScaffold>
    );
  }

  if (step === "ideal") {
    return (
      <QuestionScaffold
        eyebrow="Activity setup"
        title="What is the ideal session length?"
        description="This is the normal sweet spot before returns start to soften."
        onBack={goToPreviousStep}
      >
        <View className="flex-row flex-wrap gap-3">
          {[20, 30, 45, 60, 90, 120].map((value) => (
            <Pill
              key={value}
              label={`${value} min`}
              active={draft.idealSessionMinutes === value}
              onPress={() => {
                setIdealInput(formatSessionInput(value));
                setDraft((current) => ({
                  ...current,
                  idealSessionMinutes: value
                }));
              }}
            />
          ))}
        </View>
        <TextInput
          value={idealInput}
          style={centeredInputTextLarge}
          onChangeText={(value) => {
            const parsed = parseSessionMinutesInput(value);
            setIdealInput(value);
            setDraft((current) => ({
              ...current,
              idealSessionMinutes: parsed
            }));
          }}
          placeholder="Custom time, e.g. 45 min or 2h"
          placeholderTextColor="#9A9288"
          className="rounded-[24px] border border-line bg-paper px-5 py-5 text-xl text-ink"
        />
        {idealInput.trim() && !draft.idealSessionMinutes ? (
          <Text className="text-sm leading-6 text-mist">Use minutes or hours, like 45 min, 1h 15m, or 2h.</Text>
        ) : null}
        {draft.idealSessionMinutes && draft.minimumSessionMinutes && draft.idealSessionMinutes < draft.minimumSessionMinutes ? (
          <Text className="text-sm leading-6 text-mist">Ideal session must be at least the minimum session.</Text>
        ) : null}
        <PrimaryButton
          label={isOnboarding ? "Add activity" : "Save activity"}
          onPress={saveActivity}
          disabled={
            !draft.idealSessionMinutes ||
            !draft.minimumSessionMinutes ||
            draft.idealSessionMinutes < draft.minimumSessionMinutes
          }
        />
      </QuestionScaffold>
    );
  }

  if (!isOnboarding) {
    return (
      <QuestionScaffold
        eyebrow="Activity setup"
        title="Saved."
        description="This review step only appears during first-time onboarding."
      >
        <PrimaryButton label="Back to activities" onPress={() => props.navigation.goBack()} />
      </QuestionScaffold>
    );
  }

  return (
    <QuestionScaffold eyebrow="Activity setup" title="You can add more, or enter the app when it feels complete enough.">
      <View className="gap-3">
        {activities.map((activity) => (
          <View key={activity.id} className="rounded-[24px] border border-line bg-paper px-4 py-4">
            <Text className="text-xl text-ink">{activity.name}</Text>
            <Text className="mt-1 text-sm text-mist">
              Importance {activity.importance ?? 5}
              {"  |  "}
              {activity.type === "maintenance" && activity.hasNoRhythm
                ? "No required rhythm"
                : activity.type === "maintenance"
                  ? formatFrequencyInput(activity.frequencyPerWeek)
                  : "Progress activity"}
              {"  |  "}
              {activity.minimumSessionMinutes} minute minimum
              {"  |  "}
              {activity.idealSessionMinutes} minute ideal
            </Text>
          </View>
        ))}
      </View>
      <View className="gap-3">
        <PrimaryButton label="Add another activity" onPress={() => setStep("name")} />
        <GhostButton label="Enter the app" onPress={completeOnboarding} />
      </View>
    </QuestionScaffold>
  );
}
