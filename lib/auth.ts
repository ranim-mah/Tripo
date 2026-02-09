import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { fetchAPI } from "@/lib/fetch";

const isWeb = Platform.OS === "web";
const hasLocalStorage =
  isWeb && typeof window !== "undefined" && !!window.localStorage;
const memoryCache: Record<string, string | null> = {};

export const tokenCache = {
  async getToken(key: string) {
    if (hasLocalStorage) {
      return window.localStorage.getItem(key);
    }

    if (isWeb) {
      return memoryCache[key] ?? null;
    }

    try {
      const item = await SecureStore.getItemAsync(key);
      if (item) {
        console.log(`${key} was used 🔐 \n`);
      } else {
        console.log("No values stored under key: " + key);
      }
      return item;
    } catch (error) {
      console.error("SecureStore get item error: ", error);
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        // ignore cleanup errors on unsupported platforms
      }
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    if (hasLocalStorage) {
      window.localStorage.setItem(key, value);
      return;
    }

    if (isWeb) {
      memoryCache[key] = value;
      return;
    }

    try {
      return SecureStore.setItemAsync(key, value);
    } catch {
      return;
    }
  },
};

export const googleOAuth = async (startOAuthFlow: any) => {
  try {
    const { createdSessionId, setActive, signUp } = await startOAuthFlow({
      redirectUrl: Linking.createURL("/(root)/(tabs)/home"),
    });

    if (createdSessionId) {
      if (setActive) {
        await setActive({ session: createdSessionId });

        if (signUp.createdUserId) {
          await fetchAPI("/(api)/user", {
            method: "POST",
            body: JSON.stringify({
              name: `${signUp.firstName} ${signUp.lastName}`,
              email: signUp.emailAddress,
              clerkId: signUp.createdUserId,
            }),
          });
        }

        return {
          success: true,
          code: "success",
          message: "You have successfully signed in with Google",
        };
      }
    }

    return {
      success: false,
      message: "An error occurred while signing in with Google",
    };
  } catch (err: any) {
    console.error(err);
    return {
      success: false,
      code: err.code,
      message: err?.errors[0]?.longMessage,
    };
  }
};
