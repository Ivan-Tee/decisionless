import { ActivityIndicator, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { colors } from "@/theme/colors";

export function LoadingScreen() {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-5">
        <ActivityIndicator color={colors.accentStrong} />
        <Text className="text-base text-mist">Preparing your calm space...</Text>
      </View>
    </Screen>
  );
}
