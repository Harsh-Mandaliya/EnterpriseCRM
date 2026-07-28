import React from "react";
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

import AppButton from "@/components/common/AppButton";
import AppInput from "@/components/common/AppInput";

export default function LoginScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
        >
          {/* Top Section */}

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
              Manage your business smarter
            </Text>
          </LinearGradient>

          {/* Login Card */}

          <View style={styles.card}>
            <Text style={styles.welcome}>
              Welcome Back 👋
            </Text>

            <Text style={styles.description}>
              Login to continue using your account
            </Text>

            <View style={{ height: 25 }} />

            <AppInput placeholder="Email Address" />

            <View style={{ height: 18 }} />

            <AppInput
              placeholder="Password"
              secureTextEntry
            />

            <View style={styles.options}>
              <TouchableOpacity>
                <Text style={styles.remember}>
                  ☑ Remember me
                </Text>
              </TouchableOpacity>

              <TouchableOpacity>
                <Text style={styles.forgot}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 20 }} />

            <AppButton
              title="Sign In"
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

            <View style={styles.bottom}>
              <Text style={styles.bottomText}>
                Don't have an account?
              </Text>

              <TouchableOpacity>
                <Text style={styles.signup}>
                  Create Account
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
  },

  header: {
    height: 260,
    justifyContent: "center",
    alignItems: "center",
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
  },

  logo: {
    width: 80,
    height: 80,
    marginBottom: 18,
  },

  company: {
    fontSize: 28,
    color: "#FFF",
    fontWeight: "700",
  },

  subtitle: {
    marginTop: 8,
    color: "#DCE6FF",
    fontSize: 15,
  },

  card: {
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    marginTop: -40,
    borderRadius: 25,
    padding: 25,

    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },

  welcome: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
  },

  description: {
    marginTop: 6,
    color: "#6B7280",
    fontSize: 15,
  },

  options: {
    marginTop: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  remember: {
    color: "#374151",
    fontSize: 14,
  },

  forgot: {
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
  },

  google: {
    height: 55,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",

    justifyContent: "center",
    alignItems: "center",

    flexDirection: "row",
  },

  googleText: {
    marginLeft: 10,
    fontWeight: "600",
    fontSize: 15,
  },

  bottom: {
    flexDirection: "row",
    justifyContent: "center",
  },

  bottomText: {
    color: "#6B7280",
  },

  signup: {
    marginLeft: 5,
    color: "#2563EB",
    fontWeight: "700",
  },
});