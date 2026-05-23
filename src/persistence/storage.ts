import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

function canUseLocalStorage() {
  return Platform.OS === "web" && typeof globalThis.localStorage !== "undefined";
}

export const appStorage = {
  getItem: (name: string) => {
    if (canUseLocalStorage()) {
      return Promise.resolve(globalThis.localStorage.getItem(name));
    }

    return AsyncStorage.getItem(name);
  },
  setItem: (name: string, value: string) => {
    if (canUseLocalStorage()) {
      globalThis.localStorage.setItem(name, value);
      return Promise.resolve();
    }

    return AsyncStorage.setItem(name, value);
  },
  removeItem: (name: string) => {
    if (canUseLocalStorage()) {
      globalThis.localStorage.removeItem(name);
      return Promise.resolve();
    }

    return AsyncStorage.removeItem(name);
  }
};
