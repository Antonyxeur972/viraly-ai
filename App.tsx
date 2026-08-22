import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { SafeAreaView, StatusBar, StyleSheet, View } from "react-native";

import { BottomTabs, TabItem } from "./src/components/BottomTabs";
import { CoachScreen } from "./src/screens/CoachScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { IdeaLabScreen } from "./src/screens/IdeaLabScreen";
import { StrategyScreen } from "./src/screens/StrategyScreen";
import { VideoLabScreen } from "./src/screens/VideoLabScreen";
import { palette } from "./src/theme";

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
  const [isTikTokConnected, setTikTokConnected] = useState(false);

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
            isTikTokConnected={isTikTokConnected}
            onToggleTikTok={() => setTikTokConnected((value) => !value)}
          />
        );
    }
  }, [activeTab, isTikTokConnected]);

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
