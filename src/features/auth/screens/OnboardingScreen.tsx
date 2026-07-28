import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
} from "react-native";

import PagerView from "react-native-pager-view";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

const { width } = Dimensions.get("window");

const slides = [
  {
    id: 1,
    title: "Manage Customers Easily",
    subtitle:
      "Keep all your customers, contacts and business information organised in one place.",
    image: require("@/assets/images/onboarding/customer.png"),
  },

  {
    id: 2,
    title: "AI Powered CRM",
    subtitle:
      "Get smart recommendations, analytics and AI-driven productivity tools.",
    image: require("@/assets/images/onboarding/ai.png"),
  },

  {
    id: 3,
    title: "Grow Your Business",
    subtitle:
      "Track sales, leads, invoices and projects from anywhere in the world.",
    image: require("@/assets/images/onboarding/business.png"),
  },
];

export default function OnboardingScreen() {
  const pagerRef = useRef<PagerView>(null);

  const [page, setPage] = useState(0);

  const next = () => {
    if (page < slides.length - 1) {
      pagerRef.current?.setPage(page + 1);
    } else {
      router.replace("/auth/welcome");
    }
  };

  return (
    <LinearGradient
      colors={["#2563EB", "#1E40AF", "#0F172A"]}
      style={styles.container}
    >
      <TouchableOpacity
        style={styles.skip}
        onPress={() => router.replace("/auth/welcome")}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <PagerView
        style={{ flex: 1 }}
        initialPage={0}
        ref={pagerRef}
        onPageSelected={(e) => {
          setPage(e.nativeEvent.position);
        }}
      >
        {slides.map((item) => (
          <View
            key={item.id}
            style={styles.page}
          >
            <Image
              source={item.image}
              style={styles.image}
            />

            <Text style={styles.title}>
              {item.title}
            </Text>

            <Text style={styles.subtitle}>
              {item.subtitle}
            </Text>
          </View>
        ))}
      </PagerView>

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                page === index && styles.activeDot,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={next}
        >
          <Text style={styles.buttonText}>
            {page === slides.length - 1
              ? "Get Started"
              : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  skip: {
    marginTop: 60,
    marginRight: 25,
    alignSelf: "flex-end",
  },

  skipText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  page: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  image: {
    width: width * 0.72,
    height: width * 0.72,
    resizeMode: "contain",
    marginBottom: 40,
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },

  subtitle: {
    marginTop: 20,
    color: "#D8E5FF",
    textAlign: "center",
    fontSize: 17,
    lineHeight: 28,
  },

  bottom: {
    paddingHorizontal: 30,
    paddingBottom: 50,
  },

  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 30,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#A5B4FC",
    marginHorizontal: 5,
  },

  activeDot: {
    width: 30,
    backgroundColor: "#FFFFFF",
  },

  button: {
    backgroundColor: "#FFFFFF",
    height: 58,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },

  buttonText: {
    fontWeight: "700",
    color: "#1E40AF",
    fontSize: 18,
  },
});