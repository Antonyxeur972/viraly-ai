import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
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
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { StrategyScreen } from "./src/screens/StrategyScreen";
import { VideoLabScreen } from "./src/screens/VideoLabScreen";
import { setApiSessionToken } from "./src/services/api";
import {
  beginGoogleConnection,
  parseGoogleCallback
} from "./src/services/google";
import {
  beginTikTokConnection,
  parseTikTokCallback
} from "./src/services/tiktok";
import { ProfileAnalysisReport } from "./src/services/profileAnalysis";
import { palette } from "./src/theme";
import {
  CreatorOnboardingProfile,
  GoogleConnectionStatus,
  TikTokConnectionStatus
} from "./src/types";

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
  const [googleStatus, setGoogleStatus] = useState<GoogleConnectionStatus>("idle");
  const [googleName, setGoogleName] = useState<string | undefined>();
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [creatorSetup, setCreatorSetup] = useState<CreatorOnboardingProfile | null>(null);
  const [accountContext, setAccountContext] = useState<ProfileAnalysisReport | null>(null);

  useEffect(() => {
    const handleUrl = (url: string) => {
      const googleCallback = parseGoogleCallback(url);

      if (googleCallback) {
        if (googleCallback.connected) {
          setApiSessionToken(googleCallback.sessionId);
          setGoogleName(googleCallback.name);
          setGoogleStatus("connected");
        } else {
          setGoogleStatus("error");
          Alert.alert("Connexion Google", googleCallback.error || "La connexion a échoué.");
        }
        return;
      }

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

  const connectGoogle = async () => {
    setGoogleStatus("connecting");

    try {
      await beginGoogleConnection();
    } catch (error) {
      setGoogleStatus("error");
      Alert.alert(
        "Configuration Google requise",
        error instanceof Error ? error.message : "Impossible d'ouvrir Google."
      );
    }
  };

  const useDeveloperPreview = () => {
    if (!__DEV__) return;
    setApiSessionToken(process.env.EXPO_PUBLIC_VIRALY_DEV_TOKEN);
    setGoogleName("Antoine");
    setGoogleStatus("connected");
  };

  const finishOnboarding = (profile: CreatorOnboardingProfile) => {
    setCreatorSetup(profile);
    setOnboardingComplete(true);
  };

  const changeTab = (tab: TabKey) => {
    setActiveTab(tab);

    if (Platform.OS === "web") {
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
    }
  };

  const screen = useMemo(() => {
    if (!creatorSetup) return null;

    switch (activeTab) {
      case "video":
        return <VideoLabScreen />;
      case "ideas":
        return <IdeaLabScreen accountContext={accountContext} profile={creatorSetup} />;
      case "strategy":
        return <StrategyScreen accountContext={accountContext} profile={creatorSetup} />;
      case "coach":
        return <CoachScreen accountContext={accountContext} profile={creatorSetup} />;
      case "dashboard":
      default:
        return (
          <DashboardScreen
            onConnectTikTok={connectTikTok}
            onProfileAnalyzed={setAccountContext}
            tiktokHandle={tiktokHandle}
            tiktokStatus={tiktokStatus}
          />
        );
    }
  }, [accountContext, activeTab, creatorSetup, tiktokHandle, tiktokStatus]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ImageBackground
        resizeMode="cover"
        source={require("./assets/viraly-rainforest.png")}
        style={styles.background}
      >
        <View style={styles.scrim}>
          <LinearGradient
            colors={[
              "rgba(2,7,5,0.24)",
              "rgba(2,7,5,0.50)",
              "rgba(2,7,5,0.92)"
            ]}
            locations={[0, 0.42, 1]}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
          />
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Image
              resizeMode="cover"
              source={require("./assets/viraly-mineral-texture.png")}
              style={styles.screenTexture}
            />
          </View>
          {onboardingComplete && creatorSetup ? (
            <>
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
            </>
          ) : (
            <View style={styles.screen}>
              <OnboardingScreen
                googleName={googleName}
                googleStatus={googleStatus}
                onComplete={finishOnboarding}
                onConnectGoogle={connectGoogle}
                onDeveloperPreview={useDeveloperPreview}
              />
            </View>
          )}
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.ink,
    overflow: "hidden"
  },
  background: {
    flex: 1,
    backgroundColor: palette.ink,
    overflow: "hidden"
  },
  scrim: {
    flex: 1,
    overflow: "hidden"
  },
  screenTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.07
  },
  screen: {
    flex: 1,
    overflow: "hidden"
  }
});
