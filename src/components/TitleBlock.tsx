import { Text, View } from "react-native";

type TitleBlockProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function TitleBlock({ eyebrow, title, description }: TitleBlockProps) {
  return (
    <View className="gap-3">
      {eyebrow ? (
        <Text className="text-xs uppercase tracking-[3px] text-mist">{eyebrow}</Text>
      ) : null}
      <Text className="text-[40px] leading-[46px] text-ink">{title}</Text>
      {description ? (
        <Text className="text-base leading-7 text-mist">{description}</Text>
      ) : null}
    </View>
  );
}
