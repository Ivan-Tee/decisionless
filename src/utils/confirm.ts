import { Alert, Platform } from "react-native";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
};

export function confirmDestructive({ title, message, confirmLabel, onConfirm }: ConfirmOptions) {
  if (Platform.OS === "web" && typeof globalThis.confirm === "function") {
    if (globalThis.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }

    return;
  }

  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: onConfirm }
  ]);
}
