import { Platform, ToastAndroid, Alert } from "react-native";

export function toast(message: string) {
  if (Platform.OS === "android") {
    try {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    } catch {}
  }
  // Fallback
  Alert.alert(message);
}

