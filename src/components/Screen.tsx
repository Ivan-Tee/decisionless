import type { PropsWithChildren } from "react";
import { View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/theme/colors";

type ScreenProps = PropsWithChildren<{
  edges?: Edge[];
}>;

export function Screen({ children, edges }: ScreenProps) {
  return (
    <LinearGradient colors={[colors.paper, "#FBF8F3"]} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1" edges={edges}>
        <View className="flex-1 px-6">{children}</View>
      </SafeAreaView>
    </LinearGradient>
  );
}
