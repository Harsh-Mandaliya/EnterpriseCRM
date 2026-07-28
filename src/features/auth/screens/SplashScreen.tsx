import React, { useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  Dimensions,
  ActivityIndicator,
} from "react-native";

import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";

import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

const { width } = Dimensions.get("window");

export default function SplashScreen() {
  const scale = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, {
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(1, {
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1,
      false
    );

    const timer = setTimeout(async () => {
      /**
       * TODO:
       * Check SecureStore
       * Check JWT
       * Check Refresh Token
       */

      const isLoggedIn = false;

      if (isLoggedIn) {
        router.replace("/(tabs)");
      } else {
        router.replace("/auth/welcome");
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <LinearGradient
      colors={["#2563EB", "#1E3A8A", "#0F172A"]}
      style={styles.container}
    >
      <Animated.View
        entering={FadeIn.duration(900)}
        style={[styles.logoContainer, logoStyle]}
      >
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.logo}
        />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(300).duration(900)}
      >
        <Text style={styles.title}>
          Enterprise CRM
        </Text>

        <Text style={styles.subtitle}>
          Smart Business Management Platform
        </Text>
      </Animated.View>

      <View style={{ height: 70 }} />

      <ActivityIndicator
        color="#FFFFFF"
        size="large"
      />

      <Text style={styles.loading}>
        Initializing...
      </Text>

      <View style={styles.footer}>
        <Text style={styles.version}>
          Version 1.0.0
        </Text>

        <Text style={styles.copy}>
          © 2026 Enterprise CRM
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
  },

  logoContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.10)",
    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#FFFFFF",
    shadowOpacity: 0.35,
    shadowRadius: 25,
    elevation: 20,
  },

  logo: {
    width: 100,
    height: 100,
    resizeMode: "contain",
  },

  title: {
    marginTop: 35,
    fontSize: 34,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 1,
  },

  subtitle: {
    marginTop: 10,
    fontSize: 16,
    color: "#D6E4FF",
    textAlign: "center",
    lineHeight: 24,
    width: width * 0.8,
  },

  loading: {
    marginTop: 20,
    color: "#E2E8F0",
    fontSize: 15,
    letterSpacing: 1,
  },

  footer: {
    position: "absolute",
    bottom: 40,
    alignItems: "center",
  },

  version: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "600",
  },

  copy: {
    color: "#94A3B8",
    marginTop: 8,
    fontSize: 13,
  },
});