import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ImageBackground,
  Linking,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View
} from "react-native";

import { BottomTabs, TabItem } from "./src/components/BottomTabs";
import { CoachScreen } from "./src/screens/CoachScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { IdeaLabScreen } from "./src/screens/IdeaLabScreen";
import { StrategyScreen } from "./src/screens/StrategyScreen";
import { VideoLabScreen } from "./src/screens/VideoLabScreen";
import {
  beginTikTokConnection,
  parseTikTokCallback
} from "./src/services/tiktok";
import { palette } from "./src/theme";
import { TikTokConnectionStatus } from "./src/types";

type TabKey = "dashboard" | "video" | "ideas" | "strategy" | "coach";

const tabs: TabItem<TabKey>[] = [
  { key: "dashboard", label: "Accueil", icon: "home-outline" },
  { key: "video", label: "Analyse", icon: "stats-chart-outline" },
  { key: "ideas", label: "Idees", icon: "bulb-outline" },
  { key: "strategy", label: "Plan", icon: "calendar-outline" },
  { key: "coach", label: "Coach", icon: "chatbubbles-outline" }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [tiktokStatus, setTikTokStatus] = useState<TikTokConnectionStatus>("idle");
  const [tiktokHandle, setTikTokHandle] = useState<string | undefined>();

  useEffect(() => {
    const handleUrl = (url: string) => {
      const callback = parseTikTokCallback(url);

      if (!callback) return;

      if (callback.connected) {
        setTikTokHandle(callback.handle);
        setTikTokStatus("connected");
      } else {
        setTikTokStatus("error");
        Alert.alert("Connexion TikTok", callback.error || "La connexion a echoue.");
      }
    };

    Linking.getInitialURL().then((url) => url && handleUrl(url));
    const subscription = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, []);

  const connectTikTok = async () => {
    setTikTokStatus("connecting");

    try {
      await beginTikTokConnection();
    } catch (error) {
      setTikTokStatus("error");
      Alert.alert(
        "Configuration TikTok requise",
        error instanceof Error ? error.message : "Impossible d'ouvrir TikTok."
      );
    }
  };

  const changeTab = (tab: TabKey) => {
    setActiveTab(tab);

    if (Platform.OS === "web") {
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
    }
  };

  const screen = useMemo(() => {
    switch (activeTab) {
      case "video":
        return <VideoLabScreen />;
      case "ideas":
        return <IdeaLabScreen />;
      case "strategy":
        return <StrategyScreen />;
      case "coach":
        return <CoachScreen />;
      case "dashboard":
      default:
        return (
          <DashboardScreen
            onConnectTikTok={connectTikTok}
            tiktokHandle={tiktokHandle}
            tiktokStatus={tiktokStatus}
          />
        );
    }
  }, [activeTab, tiktokHandle, tiktokStatus]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ImageBackground
        resizeMode="cover"
        source={require("./assets/viraly-rainforest.png")}
        style={styles.background}
      >
        <View style={styles.scrim}>
          <View style={styles.screen}>{screen}</View>
          <BottomTabs
            activeTab={activeTab}
            items={tabs}
            onChange={changeTab}
            renderIcon={(item, focused) => (
              <Ionicons
                color={focused ? palette.mint : palette.muted}
                name={focused ? item.icon.replace("-outline", "") as typeof item.icon : item.icon}
                size={21}
              />
            )}
          />
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.ink
  },
  background: {
    flex: 1,
    backgroundColor: palette.ink
  },
  scrim: {
    backgroundColor: "rgba(0, 10, 8, 0.40)",
    flex: 1
  },
  screen: {
    flex: 1
  }
});
