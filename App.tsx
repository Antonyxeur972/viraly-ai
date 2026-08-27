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
import { AmbientMotion } from "./src/components/AmbientMotion";
import { ScreenTransition } from "./src/components/ScreenTransition";
import { CoachScreen } from "./src/screens/CoachScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { IdeaLabScreen } from "./src/screens/IdeaLabScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { StrategyScreen } from "./src/screens/StrategyScreen";
import { VideoLabScreen } from "./src/screens/VideoLabScreen";
import {
  clearCreatorProfile,
  createPreviewSession,
  getApiSessionToken,
  loadApiSessionToken,
  loadCreatorProfile,
  saveCreatorProfile,
  setApiSessionToken
} from "./src/services/api";
import {
  beginGoogleConnection,
  exchangeGoogleCode,
  exchangeManagedSession
} from "./src/services/google";
import {
  beginTikTokConnection,
  parseTikTokCallback
} from "./src/services/tiktok";
import {
  beginInstagramConnection,
  parseInstagramCallback
} from "./src/services/instagram";
import { listAnalysisHistory } from "./src/services/analysisHistory";
import { ProfileAnalysisReport } from "./src/services/profileAnalysis";
import { palette } from "./src/theme";
import {
  CreatorOnboardingProfile,
  GoogleConnectionStatus,
  SocialConnectionStatus
} from "./src/types";

type TabKey = "dashboard" | "video" | "ideas" | "strategy" | "coach";

const tabs: TabItem<TabKey>[] = [
  { key: "dashboard", label: "Accueil", icon: "home-outline" },
  { key: "strategy", label: "Plan", icon: "calendar-clear-outline" },
  { key: "video", label: "Analyse", icon: "scan-outline" },
  { key: "ideas", label: "Idées", icon: "sparkles-outline" },
  { key: "coach", label: "Coach", icon: "chatbubble-ellipses-outline" }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [tiktokStatus, setTikTokStatus] = useState<SocialConnectionStatus>("idle");
  const [tiktokHandle, setTikTokHandle] = useState<string | undefined>();
  const [instagramStatus, setInstagramStatus] = useState<SocialConnectionStatus>("idle");
  const [instagramHandle, setInstagramHandle] = useState<string | undefined>();
  const [googleStatus, setGoogleStatus] = useState<GoogleConnectionStatus>("idle");
  const [googleName, setGoogleName] = useState<string | undefined>();
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [creatorSetup, setCreatorSetup] = useState<CreatorOnboardingProfile | null>(null);
  const [accountContext, setAccountContext] = useState<ProfileAnalysisReport | null>(null);

  useEffect(() => {
    const handleUrl = (url: string) => {
      const instagramCallback = parseInstagramCallback(url);
      if (instagramCallback) {
        if (instagramCallback.connected) {
          setInstagramHandle(instagramCallback.handle);
          setInstagramStatus("connected");
        } else {
          setInstagramStatus("error");
          Alert.alert("Connexion Instagram", instagramCallback.error || "La connexion a échoué.");
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

  const connectInstagram = async () => {
    setInstagramStatus("connecting");

    try {
      await beginInstagramConnection();
    } catch (error) {
      setInstagramStatus("error");
      Alert.alert(
        "Configuration Instagram requise",
        error instanceof Error ? error.message : "Impossible d'ouvrir Instagram."
      );
    }
  };

  const activateApiSession = async (token: string, name: string) => {
    setApiSessionToken(token);
    setGoogleName(name);
    setGoogleStatus("connected");

    const storedProfile = await loadCreatorProfile();
    if (storedProfile) {
      setCreatorSetup(storedProfile);
      setOnboardingComplete(true);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const token = await loadApiSessionToken();
      if (!token) return;

      const storedProfile = await loadCreatorProfile();
      if (!getApiSessionToken()) {
        const session = await createPreviewSession();
        if (!cancelled) await activateApiSession(session.token, session.name);
        return;
      }

      if (cancelled) return;
      setGoogleName("Créateur");
      setGoogleStatus("connected");
      if (storedProfile) {
        setCreatorSetup(storedProfile);
        setOnboardingComplete(true);
      }
    };

    restoreSession().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!onboardingComplete || !creatorSetup || !getApiSessionToken()) return;
    let cancelled = false;
    listAnalysisHistory<ProfileAnalysisReport>("profile", 1)
      .then((items) => {
        if (!cancelled && items[0]?.report) setAccountContext(items[0].report);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [creatorSetup, onboardingComplete]);

  const connectGoogle = async () => {
    setGoogleStatus("connecting");

    try {
      const callback = await beginGoogleConnection();
      if (callback.connected && callback.sessionId) {
        const session = await exchangeManagedSession(callback.sessionId);
        await activateApiSession(session.token, session.name);
        return;
      }
      if (!callback.connected || !callback.code) {
        if (callback.error?.toLowerCase().includes("google")) {
          const session = await createPreviewSession();
          await activateApiSession(session.token, session.name);
          Alert.alert(
            "Accès test activé",
            "Google n'est pas encore finalisé côté OAuth. Tu peux utiliser VIRALY AI avec l'accès test."
          );
          return;
        }
        throw new Error(callback.error || "La connexion Google a échoué.");
      }
      const session = await exchangeGoogleCode(callback.code);
      await activateApiSession(session.token, session.name);
    } catch (error) {
      setGoogleStatus("error");
      Alert.alert(
        "Configuration Google requise",
        error instanceof Error ? error.message : "Impossible d'ouvrir Google."
      );
    }
  };

  const useDeveloperPreview = async () => {
    setGoogleStatus("connecting");
    try {
      const session = await createPreviewSession();
      await activateApiSession(session.token, session.name);
    } catch (error) {
      setGoogleStatus("error");
      Alert.alert(
        "Accès test indisponible",
        error instanceof Error ? error.message : "Impossible d'ouvrir la version de test."
      );
    }
  };

  const finishOnboarding = (profile: CreatorOnboardingProfile) => {
    setCreatorSetup(profile);
    setOnboardingComplete(true);
    saveCreatorProfile(profile).catch(() => {});
  };

  const resetCreatorProfile = async () => {
    await clearCreatorProfile();
    setCreatorSetup(null);
    setAccountContext(null);
    setOnboardingComplete(false);
    setActiveTab("dashboard");
  };

  const changeTab = (tab: TabKey) => {
    setActiveTab(tab);

    if (Platform.OS === "web") {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "auto" });
        document.querySelector<HTMLElement>('[data-testid="viraly-shell"]')?.scrollTo({ top: 0 });
      });
    }
  };

  const screen = useMemo(() => {
    if (!creatorSetup) return null;
    const platform = creatorSetup.platform || "tiktok";
    const socialStatus = platform === "instagram" ? instagramStatus : tiktokStatus;
    const socialHandle = platform === "instagram" ? instagramHandle : tiktokHandle;
    const connectSocial = platform === "instagram" ? connectInstagram : connectTikTok;

    switch (activeTab) {
      case "video":
        return (
          <VideoLabScreen
            onConnectSocial={connectSocial}
            platform={platform}
            socialHandle={socialHandle}
            socialStatus={socialStatus}
          />
        );
      case "ideas":
        return <IdeaLabScreen accountContext={accountContext} profile={creatorSetup} />;
      case "strategy":
        return (
          <StrategyScreen
            accountContext={accountContext}
            onResetCreatorProfile={resetCreatorProfile}
            profile={creatorSetup}
          />
        );
      case "coach":
        return <CoachScreen accountContext={accountContext} profile={creatorSetup} />;
      case "dashboard":
      default:
        return (
          <DashboardScreen
            onConnectSocial={connectSocial}
            onProfileAnalyzed={setAccountContext}
            platform={platform}
            profile={creatorSetup}
            socialHandle={socialHandle}
            socialStatus={socialStatus}
          />
        );
    }
  }, [accountContext, activeTab, creatorSetup, instagramHandle, instagramStatus, tiktokHandle, tiktokStatus]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ImageBackground
        resizeMode="cover"
        source={require("./assets/viraly-neural-field.png")}
        style={styles.background}
      >
        <View style={styles.scrim} testID="viraly-shell">
          <AmbientMotion />
          <LinearGradient
            colors={[
              "rgba(0,3,12,0.16)",
              "rgba(1,6,19,0.54)",
              "rgba(1,4,13,0.90)"
            ]}
            locations={[0, 0.52, 1]}
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
              <View key={activeTab} style={styles.screen}><ScreenTransition>{screen}</ScreenTransition></View>
              <BottomTabs
                activeTab={activeTab}
                items={tabs}
                onChange={changeTab}
                renderIcon={(item, focused) => (
                  <Ionicons
                    color={focused ? palette.white : palette.muted}
                    name={focused ? item.icon.replace("-outline", "") as typeof item.icon : item.icon}
                    size={22}
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
                previewAvailable
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
