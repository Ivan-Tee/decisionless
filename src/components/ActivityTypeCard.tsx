import { Pressable, Text, View } from "react-native";

type ActivityTypeCardProps = {
  title: string;
  description: string;
  onPress: () => void;
};

export function ActivityTypeCard({ title, description, onPress }: ActivityTypeCardProps) {
  return (
    <Pressable onPress={onPress} className="rounded-[26px] border border-line bg-paper px-5 py-6">
      <View className="gap-2">
        <Text className="text-2xl text-ink">{title}</Text>
        <Text className="text-base leading-7 text-mist">{description}</Text>
      </View>
    </Pressable>
  );
}
