import type { TextStyle } from "react-native";

const baseCenteredInputText: TextStyle = {
  includeFontPadding: false,
  paddingBottom: 0,
  paddingTop: 0,
  textAlignVertical: "center"
};

export const centeredInputTextRegular: TextStyle = {
  ...baseCenteredInputText,
  lineHeight: 22,
  minHeight: 56
};

export const centeredInputTextLarge: TextStyle = {
  ...baseCenteredInputText,
  lineHeight: 24,
  minHeight: 64
};
