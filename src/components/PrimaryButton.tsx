import { Pressable, Text } from "react-native";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export function PrimaryButton({ label, onPress, disabled = false }: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`items-center rounded-full px-6 py-4 ${disabled ? "bg-[#B8B1A8]" : "bg-ink"}`}
    >
      <Text className="text-sm font-medium text-white">{label}</Text>
    </Pressable>
  );
}
