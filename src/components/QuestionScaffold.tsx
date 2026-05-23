import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { TitleBlock } from "@/components/TitleBlock";

type QuestionScaffoldProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  description?: string;
  onBack?: () => void;
}>;

export function QuestionScaffold({
  eyebrow,
  title,
  description,
  onBack,
  children
}: QuestionScaffoldProps) {
  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 28 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(180)}>
            <Card>
              <View className="gap-8">
                {onBack ? (
                  <Pressable onPress={onBack} className="self-start rounded-full border border-line bg-paper px-4 py-2">
                    <Text className="text-sm font-medium text-mist">Back</Text>
                  </Pressable>
                ) : null}
                <TitleBlock eyebrow={eyebrow} title={title} description={description} />
                {children}
              </View>
            </Card>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
