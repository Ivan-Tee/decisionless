import { GestureResponderEvent, Pressable, Text } from "react-native";

type GhostButtonProps = {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
};

export function GhostButton({ label, onPress }: GhostButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      className="items-center rounded-full border border-line bg-card px-6 py-4"
    >
      <Text className="text-sm font-medium text-mist">{label}</Text>
    </Pressable>
  );
}
