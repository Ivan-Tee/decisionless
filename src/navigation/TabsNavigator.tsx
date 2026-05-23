import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable } from "react-native";
import { ActivitiesScreen } from "@/screens/ActivitiesScreen";
import { ActivityCreationScreen } from "@/screens/ActivityCreationScreen";
import { ActivityEditScreen } from "@/screens/ActivityEditScreen";
import { DailyScreen } from "@/screens/DailyScreen";
import { HistoryScreen } from "@/screens/HistoryScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { colors } from "@/theme/colors";

export type TodayStackParamList = {
  TodayHome: undefined;
  ActivityDetail: { activityId: string };
  History: undefined;
};

export type ActivitiesStackParamList = {
  ActivitiesHome: undefined;
  AddActivity: undefined;
  ActivityDetail: { activityId: string };
};

const Tab = createBottomTabNavigator();
const TodayStack = createNativeStackNavigator<TodayStackParamList>();
const ActivitiesStack = createNativeStackNavigator<ActivitiesStackParamList>();

function TodayStackScreen() {
  return (
    <TodayStack.Navigator
      screenOptions={{
        animation: "fade",
        contentStyle: { backgroundColor: colors.paper },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.paper },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: "500" }
      }}
    >
      <TodayStack.Screen
        name="TodayHome"
        component={DailyScreen}
        options={({ navigation }) => ({
          title: "",
          headerRight: () => (
            <Pressable
              onPress={() => navigation.navigate("History")}
              className="mr-4 h-10 w-10 items-center justify-center rounded-full"
            >
              <Ionicons name="time-outline" size={22} color={colors.mist} />
            </Pressable>
          )
        })}
      />
      <TodayStack.Screen
        name="ActivityDetail"
        component={ActivityEditScreen}
        options={{ title: "Edit activity" }}
      />
      <TodayStack.Screen name="History" component={HistoryScreen} />
    </TodayStack.Navigator>
  );
}

function ActivitiesStackScreen() {
  return (
    <ActivitiesStack.Navigator
      screenOptions={{
        animation: "fade",
        contentStyle: { backgroundColor: colors.paper },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.paper },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: "500" }
      }}
    >
      <ActivitiesStack.Screen
        name="ActivitiesHome"
        component={ActivitiesScreen}
        options={({ navigation }) => ({
          title: "",
          headerRight: () => (
            <Pressable onPress={() => navigation.navigate("AddActivity")} className="mr-4">
              <Ionicons name="add" size={26} color={colors.mist} />
            </Pressable>
          )
        })}
      />
      <ActivitiesStack.Screen
        name="AddActivity"
        component={ActivityCreationScreen}
        options={{ title: "New activity" }}
      />
      <ActivitiesStack.Screen
        name="ActivityDetail"
        component={ActivityEditScreen}
        options={{ title: "Edit activity" }}
      />
    </ActivitiesStack.Navigator>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        animation: "fade",
        headerShown: false,
        sceneStyle: { backgroundColor: colors.paper },
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.line,
          height: 78,
          paddingTop: 8,
          paddingBottom: 12
        },
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.mist
      }}
    >
      <Tab.Screen
        name="Today"
        component={TodayStackScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="sunny-outline" color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Activities"
        component={ActivitiesStackScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="albums-outline" color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} />
        }}
      />
    </Tab.Navigator>
  );
}
