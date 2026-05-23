import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityCreationScreen } from "@/screens/ActivityCreationScreen";
import { MainTabs } from "@/navigation/TabsNavigator";
import { WelcomeScreen } from "@/screens/WelcomeScreen";
import { useActivityStore } from "@/store/activityStore";
import { useAppReady } from "@/hooks/useAppReady";
import { LoadingScreen } from "@/screens/LoadingScreen";
import { colors } from "@/theme/colors";

export type RootStackParamList = {
  Welcome: undefined;
  ActivityCreation: undefined;
  MainTabs: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.paper,
    card: colors.paper,
    text: colors.ink,
    border: colors.line,
    primary: colors.accentStrong
  }
};

export function RootNavigator() {
  const ready = useAppReady();
  const hasCompletedOnboarding = useActivityStore((state) => state.hasCompletedOnboarding);

  if (!ready) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        key={hasCompletedOnboarding ? "app" : "onboarding"}
        screenOptions={{ headerShown: false, animation: "fade", animationDuration: 180 }}
      >
        {hasCompletedOnboarding ? (
          <Stack.Screen name="MainTabs" component={MainTabs} />
        ) : (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="ActivityCreation" component={ActivityCreationScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
