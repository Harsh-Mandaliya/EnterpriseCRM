import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import AppButton from "@/components/common/AppButton";

export default function VerifyEmailScreen() {
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    if (timer === 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const resendEmail = () => {
    if (timer > 0) return;

    // TODO
    // Call resend email API

    setTimer(60);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={["#2563EB", "#1D4ED8", "#0F172A"]}
        style={styles.container}
      >
        <Image
          source={require("@/assets/images/email.png")}
          style={styles.image}
        />

        <Text style={styles.title}>
          Verify Your Email
        </Text>

        <Text style={styles.subtitle}>
          We've sent a verification email to
        </Text>

        <Text style={styles.email}>
          harsh@example.com
        </Text>

        <Text style={styles.info}>
          Please check your inbox and click the verification link
          before continuing.
        </Text>

        <AppButton
          title="Continue to OTP"
          onPress={() => router.push("/auth/verify-otp")}
        />

        <TouchableOpacity
          style={styles.resend}
          onPress={resendEmail}
        >
          <Ionicons
            name="refresh"
            size={18}
            color="#FFFFFF"
          />

          <Text style={styles.resendText}>
            {timer === 0
              ? "Resend Email"
              : `Resend in ${timer}s`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
        >
          <Text style={styles.back}>
            ← Back to Register
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },

  image: {
    width: 220,
    height: 220,
    resizeMode: "contain",
    marginBottom: 35,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
  },

  subtitle: {
    marginTop: 20,
    color: "#D6E4FF",
    fontSize: 16,
  },

  email: {
    marginTop: 12,
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "700",
  },

  info: {
    marginTop: 20,
    color: "#D6E4FF",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 45,
  },

  resend: {
    marginTop: 25,
    flexDirection: "row",
    alignItems: "center",
  },

  resendText: {
    color: "#FFFFFF",
    marginLeft: 8,
    fontWeight: "600",
    fontSize: 16,
  },

  back: {
    marginTop: 40,
    color: "#D6E4FF",
    textDecorationLine: "underline",
    fontSize: 15,
  },
});