import { Pressable, Text } from "react-native";

type PillProps = {
  label: string;
  active?: boolean;
  onPress: () => void;
};

export function Pill({ label, active = false, onPress }: PillProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-4 py-3 ${
        active ? "border-accentStrong bg-accentStrong" : "border-line bg-card"
      }`}
    >
      <Text className={`text-sm ${active ? "text-white" : "text-mist"}`}>{label}</Text>
    </Pressable>
  );
}
