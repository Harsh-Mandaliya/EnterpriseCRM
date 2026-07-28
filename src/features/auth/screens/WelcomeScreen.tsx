import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#2563EB", "#1D4ED8", "#0F172A"]}
        style={styles.gradient}
      >
        {/* Illustration */}

        <Image
          source={require("@/assets/images/welcome.png")}
          style={styles.image}
        />

        {/* Title */}

        <Text style={styles.title}>
          Welcome to{"\n"}Enterprise CRM
        </Text>

        <Text style={styles.subtitle}>
          Manage Customers, Leads, Projects,
          Tasks and Reports from one beautiful platform.
        </Text>

        {/* Buttons */}

        <TouchableOpacity
          style={styles.primary}
          onPress={() => router.push("/auth/register")}
        >
          <Text style={styles.primaryText}>
            Create Account
          </Text>

          <Ionicons
            name="arrow-forward"
            size={22}
            color="#2563EB"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondary}
          onPress={() => router.push("/auth/login")}
        >
          <Text style={styles.secondaryText}>
            Sign In
          </Text>
        </TouchableOpacity>

        <TouchableOpacity>
          <Text style={styles.guest}>
            Continue as Guest
          </Text>
        </TouchableOpacity>

        {/* Footer */}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Version 1.0.0
          </Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  gradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  image: {
    width: width * 0.82,
    height: width * 0.82,
    resizeMode: "contain",
    marginBottom: 35,
  },

  title: {
    fontSize: 34,
    color: "#FFF",
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 44,
  },

  subtitle: {
    marginTop: 18,
    color: "#D6E4FF",
    textAlign: "center",
    fontSize: 17,
    lineHeight: 28,
    marginBottom: 45,
  },

  primary: {
    width: "100%",
    height: 60,
    backgroundColor: "#FFF",
    borderRadius: 18,

    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  primaryText: {
    color: "#2563EB",
    fontSize: 18,
    fontWeight: "700",
    marginRight: 8,
  },

  secondary: {
    width: "100%",
    height: 60,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#FFF",
    marginTop: 18,

    justifyContent: "center",
    alignItems: "center",
  },

  secondaryText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 18,
  },

  guest: {
    marginTop: 28,
    color: "#D6E4FF",
    fontSize: 16,
    textDecorationLine: "underline",
  },

  footer: {
    position: "absolute",
    bottom: 30,
  },

  footerText: {
    color: "#CBD5E1",
    fontSize: 14,
  },
});