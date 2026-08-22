import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Linking, SafeAreaView, StatusBar, StyleSheet, View } from "react-native";

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
  { key: "dashboard", label: "Pulse", icon: "pulse-outline" },
  { key: "video", label: "Video", icon: "videocam-outline" },
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
      <StatusBar barStyle="light-content" backgroundColor={palette.ink} />
      <View style={styles.appShell}>
        <View style={styles.screen}>{screen}</View>
        <BottomTabs
          activeTab={activeTab}
          items={tabs}
          onChange={setActiveTab}
          renderIcon={(item, focused) => (
            <Ionicons
              color={focused ? palette.ink : palette.muted}
              name={item.icon}
              size={21}
            />
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.ink
  },
  appShell: {
    flex: 1,
    backgroundColor: palette.ink
  },
  screen: {
    flex: 1
  }
});
