import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { View } from "react-native";

type CardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export function Card({ children, style }: CardProps) {
  return (
    <View
      className="rounded-[30px] border border-line bg-card p-6"
      style={style}
    >
      {children}
    </View>
  );
}
