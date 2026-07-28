import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import AppButton from "@/components/common/AppButton";
import AppInput from "@/components/common/AppInput";

export default function RegisterScreen() {
  const [acceptTerms, setAcceptTerms] = useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}

          <LinearGradient
            colors={["#2563EB", "#1E40AF"]}
            style={styles.header}
          >
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logo}
            />

            <Text style={styles.company}>Enterprise CRM</Text>

            <Text style={styles.subtitle}>
              Create your business account
            </Text>
          </LinearGradient>

          {/* Card */}

          <View style={styles.card}>
            <Text style={styles.title}>Create Account 🚀</Text>

            <Text style={styles.description}>
              Fill in the information below to create your account.
            </Text>

            <View style={styles.row}>
              <View style={styles.half}>
                <AppInput placeholder="First Name" />
              </View>

              <View style={styles.space} />

              <View style={styles.half}>
                <AppInput placeholder="Last Name" />
              </View>
            </View>

            <View style={styles.gap} />

            <AppInput placeholder="Email Address" />

            <View style={styles.gap} />

            <AppInput
              placeholder="Phone Number"
              keyboardType="phone-pad"
            />

            <View style={styles.gap} />

            <AppInput
              placeholder="Password"
              secureTextEntry
            />

            <View style={styles.gap} />

            <AppInput
              placeholder="Confirm Password"
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAcceptTerms(!acceptTerms)}
            >
              <Ionicons
                name={acceptTerms ? "checkbox" : "square-outline"}
                size={22}
                color="#2563EB"
              />

              <Text style={styles.checkboxText}>
                I agree to the{" "}
                <Text style={styles.link}>Terms & Conditions</Text>
              </Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />

            <AppButton
              title="Create Account"
              onPress={() => {}}
            />

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.or}>OR</Text>
              <View style={styles.line} />
            </View>

            <TouchableOpacity style={styles.google}>
              <Ionicons
                name="logo-google"
                size={20}
                color="#DB4437"
              />

              <Text style={styles.googleText}>
                Continue with Google
              </Text>
            </TouchableOpacity>

            <View style={{ height: 30 }} />

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Already have an account?
              </Text>

              <TouchableOpacity onPress={() => router.push("/auth/login")}>
                <Text style={styles.login}>
                  Login
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },

  scroll: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  header: {
    height: 250,
    justifyContent: "center",
    alignItems: "center",
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
  },

  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
    resizeMode: "contain",
  },

  company: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFF",
  },

  subtitle: {
    color: "#DDE7FF",
    marginTop: 8,
    fontSize: 15,
  },

  card: {
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    marginTop: -35,
    borderRadius: 24,
    padding: 24,

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },

  description: {
    marginTop: 6,
    color: "#6B7280",
    fontSize: 15,
    marginBottom: 25,
  },

  row: {
    flexDirection: "row",
  },

  half: {
    flex: 1,
  },

  space: {
    width: 12,
  },

  gap: {
    height: 18,
  },

  checkboxContainer: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
  },

  checkboxText: {
    marginLeft: 10,
    flex: 1,
    color: "#374151",
    fontSize: 14,
  },

  link: {
    color: "#2563EB",
    fontWeight: "600",
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 28,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },

  or: {
    marginHorizontal: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },

  google: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },

  googleText: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  footerText: {
    color: "#6B7280",
  },

  login: {
    marginLeft: 6,
    color: "#2563EB",
    fontWeight: "700",
  },
});