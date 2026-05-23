import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { View } from "react-native";
import { ActivityTypeCard } from "@/components/ActivityTypeCard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { QuestionScaffold } from "@/components/QuestionScaffold";
import type { RootStackParamList } from "@/navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <QuestionScaffold
      title="Build and prioritise your daily tasks in seconds."
      description="There are two main types of activities: Maintenance and Progress. Identifying the type helps the app understand what matters most today."
    >
      <View className="gap-4">
        <ActivityTypeCard
          title="Maintenance"
          description="Things like language practice or sport that require consistency for the best results."
          onPress={() => navigation.navigate("ActivityCreation")}
        />
        <ActivityTypeCard
          title="Progress"
          description="Things like projects or coding that require deeper work and can be done in focused blocks for the best results."
          onPress={() => navigation.navigate("ActivityCreation")}
        />
      </View>
      <PrimaryButton label="Begin" onPress={() => navigation.navigate("ActivityCreation")} />
    </QuestionScaffold>
  );
}
