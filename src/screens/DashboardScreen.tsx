import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import { ActionCard } from "../components/ActionCard";
import { MetricCard } from "../components/MetricCard";
import { ProgressBar } from "../components/ProgressBar";
import { ScoreDial } from "../components/ScoreDial";
import { SectionHeader } from "../components/SectionHeader";
import { Tag } from "../components/Tag";
import {
  accountMetrics,
  creatorProfile,
  recentVideos,
  trendSignals
} from "../data/viralInsights";
import { formatCompactNumber, gradeVideo } from "../lib/viralScore";
import { estimateRevenuePotential } from "../lib/revenueModel";
import {
  ProfileAnalysisReport,
  requestProfileAnalysis
} from "../services/profileAnalysis";
import { palette, radius, spacing, typography } from "../theme";
import { TikTokConnectionStatus } from "../types";

type Props = {
  tiktokStatus: TikTokConnectionStatus;
  tiktokHandle?: string;
  onConnectTikTok: () => void;
};

const euro = (value: number) => `${formatCompactNumber(value)} EUR`;

export function DashboardScreen({
  tiktokStatus,
  tiktokHandle,
  onConnectTikTok
}: Props) {
  const [profileScreenshot, setProfileScreenshot] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [profileReport, setProfileReport] =
    useState<ProfileAnalysisReport | null>(null);
  const [isAnalyzingProfile, setIsAnalyzingProfile] = useState(false);
  const bestVideo = gradeVideo(recentVideos[0]);
  const isTikTokConnected = tiktokStatus === "connected";
  const revenueForecast = estimateRevenuePotential({
    followers: creatorProfile.followers,
    averageViews: 48000
  });
  const connectionLabel =
    tiktokStatus === "connecting"
      ? "Connexion..."
      : isTikTokConnected
        ? "Connecte"
        : "TikTok";

  const pickProfileScreenshot = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Acces aux photos",
        "Autorise VIRALY AI a ouvrir ta galerie pour choisir la capture du profil."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [9, 16],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1
    });

    if (!result.canceled) {
      setProfileScreenshot(result.assets[0]);
      setProfileReport(null);
    }
  };

  const analyzeProfileScreenshot = async () => {
    if (!profileScreenshot) return;

    setIsAnalyzingProfile(true);

    try {
      const remoteReport = await requestProfileAnalysis(profileScreenshot);
      setProfileReport(
        remoteReport || {
          score: 58,
          confidence: "faible",
          summary:
            "Capture recue. Cette pre-analyse devient precise des que le moteur visuel est relie au backend VIRALY AI.",
          visibleSignals: [
            "Page d'accueil TikTok importee",
            "Format vertical exploitable",
            "Source identifiee comme capture, pas comme donnees TikTok certifiees"
          ],
          priorities: [
            "Garder le pseudo, la bio et les compteurs visibles",
            "Inclure les couvertures des videos recentes",
            "Ajouter ensuite les statistiques TikTok pour affiner le revenu"
          ]
        }
      );
    } catch (error) {
      Alert.alert(
        "Analyse du profil",
        error instanceof Error ? error.message : "La capture n'a pas pu etre analysee."
      );
    } finally {
      setIsAnalyzingProfile(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.brandRow}>
          <View>
            <Text style={styles.brand}>VIRALY <Text style={styles.brandAccent}>AI</Text></Text>
            <Text style={styles.handle}>Salut Antoine · aperçu du jour</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={tiktokStatus === "connecting"}
            onPress={onConnectTikTok}
            style={[
              styles.connectButton,
              isTikTokConnected && styles.connectButtonActive
            ]}
          >
            <Ionicons
              color={isTikTokConnected ? palette.ink : palette.white}
              name={isTikTokConnected ? "checkmark-circle" : "logo-tiktok"}
              size={18}
            />
            <Text
              style={[
                styles.connectText,
                isTikTokConnected && styles.connectTextActive
              ]}
            >
              {connectionLabel}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Ton contenu prend de la vitesse.</Text>
        <Text style={styles.subtitle}>Deux vidéos ont généré 68% de ta croissance cette semaine.</Text>

        <View style={styles.heroTags}>
          <Tag label={creatorProfile.niche} color={palette.mint} />
          <Tag label={`stage ${creatorProfile.stage}`} color={palette.lemon} />
          <Tag label={`${formatCompactNumber(creatorProfile.followers)} abonnes`} color={palette.paper} />
        </View>
      </View>

      {!isTikTokConnected ? (
        <View style={styles.importCard}>
          <View style={styles.importHeading}>
            <View style={styles.importIcon}>
              <Ionicons color={palette.ink} name="scan-outline" size={22} />
            </View>
            <View style={styles.importCopy}>
              <Text style={styles.importEyebrow}>Sans connexion TikTok</Text>
              <Text style={styles.importTitle}>Analyse une capture de ton profil</Text>
            </View>
          </View>
          <Text style={styles.importBody}>
            Prends un screen de ta page d'accueil avec la bio, les compteurs et les
            dernieres videos visibles.
          </Text>

          {profileScreenshot ? (
            <Image
              accessibilityLabel="Capture du profil TikTok selectionnee"
              resizeMode="cover"
              source={{ uri: profileScreenshot.uri }}
              style={styles.profilePreview}
            />
          ) : null}

          <View style={styles.importActions}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={pickProfileScreenshot}
              style={styles.galleryButton}
            >
              <Ionicons color={palette.white} name="images-outline" size={18} />
              <Text style={styles.galleryButtonText}>
                {profileScreenshot ? "Remplacer" : "Choisir le screen"}
              </Text>
            </TouchableOpacity>
            {profileScreenshot ? (
              <TouchableOpacity
                accessibilityRole="button"
                disabled={isAnalyzingProfile}
                onPress={analyzeProfileScreenshot}
                style={styles.profileAnalyzeButton}
              >
                <Ionicons color={palette.ink} name="sparkles-outline" size={18} />
                <Text style={styles.profileAnalyzeText}>
                  {isAnalyzingProfile ? "Analyse..." : "Analyser"}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {profileReport ? (
            <View style={styles.profileReport}>
              <View style={styles.profileReportTop}>
                <Text style={styles.profileReportTitle}>Diagnostic initial</Text>
                <Text style={styles.profileReportScore}>{profileReport.score}/100</Text>
              </View>
              <Text style={styles.profileConfidence}>
                Confiance {profileReport.confidence} · estimation sur capture
              </Text>
              <Text style={styles.profileReportSummary}>{profileReport.summary}</Text>
              {profileReport.priorities.map((priority) => (
                <View key={priority} style={styles.profilePriority}>
                  <Ionicons color={palette.mint} name="arrow-forward-circle" size={18} />
                  <Text style={styles.profilePriorityText}>{priority}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <ScoreDial
        caption="Progression de 12,4% sur 7 jours. Le format conseils pratiques mène la croissance."
        label="Momentum createur"
        score={82}
      />

      <View style={styles.trendCard}>
        <View style={styles.trendTop}>
          <View>
            <Text style={styles.trendLabel}>Évolution des vues</Text>
            <Text style={styles.trendValue}>336K <Text style={styles.trendDelta}>+18%</Text></Text>
          </View>
          <Text style={styles.trendPeriod}>7 derniers jours</Text>
        </View>
        <View style={styles.miniChart}>
          {[38, 31, 54, 63, 51, 72, 96].map((height, index) => (
            <View key={index} style={styles.chartColumn}>
              <View style={[styles.chartBar, { height: `${height}%` }]} />
              <Text style={styles.chartDay}>{["L", "M", "M", "J", "V", "S", "D"][index]}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.metricStrip}>
        {accountMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </View>

      <SectionHeader eyebrow="Potentiel revenus" title="Ce que le compte peut viser" />
      <View style={styles.revenueHero}>
        <Text style={styles.revenueRange}>
          {euro(revenueForecast.monthlyLow)} - {euro(revenueForecast.monthlyHigh)} / mois
        </Text>
        <Text style={styles.revenueBasis}>
          Scenario base sur {formatCompactNumber(revenueForecast.monthlyViews)} vues mensuelles,
          24 publications et quatre canaux de monetisation.
        </Text>
        <View style={styles.revenueChannels}>
          {revenueForecast.channels.slice(0, 3).map((channel) => (
            <View key={channel.name} style={styles.revenueLine}>
              <Text style={styles.revenueName}>{channel.name}</Text>
              <Text style={styles.revenueValue}>
                {euro(channel.monthlyLow)} - {euro(channel.monthlyHigh)}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.disclaimer}>{revenueForecast.disclaimer}</Text>
      </View>

      <SectionHeader
        eyebrow="Opportunités"
        title="À faire aujourd'hui"
      />
      <View style={styles.stack}>
        <ActionCard
          accent={palette.mint}
          body="Publie ton contenu educatif a 19:20 avec une promesse chiffree et un exemple visuel."
          icon="rocket-outline"
          meta="priorite A"
          title="Poster dans la bonne fenetre"
        />
        <ActionCard
          accent={palette.lemon}
          body="Demande a ton audience quel blocage TikTok elle veut resoudre cette semaine."
          icon="phone-portrait-outline"
          meta="story"
          title="Prechauffer l'idee"
        />
        <ActionCard
          accent={palette.coral}
          body="Transforme les 3 meilleurs commentaires en scripts de 20 secondes."
          icon="chatbox-ellipses-outline"
          meta="recherche"
          title="Miner les commentaires"
        />
      </View>

      <SectionHeader
        eyebrow="Diagnostic"
        title="Ce qui tire deja la croissance"
        action="score live"
      />
      <View style={styles.stack}>
        {trendSignals.map((signal) => (
          <View key={signal.title} style={styles.signalCard}>
            <View style={styles.signalTop}>
              <Text style={styles.signalTitle}>{signal.title}</Text>
              <Text style={styles.confidence}>{signal.confidence}%</Text>
            </View>
            <ProgressBar color={signal.accent} value={signal.confidence} />
            <Text style={styles.signalInsight}>{signal.insight}</Text>
            <Text style={styles.signalAction}>{signal.action}</Text>
          </View>
        ))}
      </View>

      <SectionHeader eyebrow="Video gagnante" title={recentVideos[0].title} />
      <View style={styles.bestVideo}>
        <Text style={styles.bestScore}>{bestVideo.score}</Text>
        <View style={styles.bestCopy}>
          <Text style={styles.bestLabel}>{bestVideo.label}</Text>
          <Text style={styles.bestAdvice}>{bestVideo.advice}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl
  },
  hero: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
    paddingTop: spacing.md
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  brand: {
    color: palette.white,
    fontSize: 26,
    fontWeight: "900"
  },
  brandAccent: {
    color: palette.mint
  },
  handle: {
    ...typography.caption,
    color: palette.muted,
    marginTop: 3
  },
  connectButton: {
    alignItems: "center",
    backgroundColor: palette.panel,
    borderColor: palette.line,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 42,
    paddingHorizontal: spacing.md
  },
  connectButtonActive: {
    backgroundColor: palette.mint,
    borderColor: palette.mint
  },
  connectText: {
    ...typography.caption,
    color: palette.white
  },
  connectTextActive: {
    color: palette.ink
  },
  title: {
    ...typography.h2,
    color: palette.white,
    marginTop: spacing.sm
  },
  subtitle: {
    ...typography.body,
    color: palette.paperMuted
  },
  heroTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  importCard: {
    backgroundColor: palette.panel,
    borderColor: palette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  importHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  importIcon: {
    alignItems: "center",
    backgroundColor: palette.mint,
    borderRadius: radius.sm,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  importCopy: {
    flex: 1,
    gap: 2
  },
  importEyebrow: {
    ...typography.caption,
    color: palette.mint
  },
  importTitle: {
    ...typography.h3,
    color: palette.white
  },
  importBody: {
    ...typography.body,
    color: palette.paperMuted
  },
  profilePreview: {
    aspectRatio: 9 / 16,
    alignSelf: "center",
    backgroundColor: palette.graphite,
    borderRadius: radius.sm,
    maxHeight: 360,
    width: "58%"
  },
  importActions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  galleryButton: {
    alignItems: "center",
    borderColor: palette.line,
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.sm
  },
  galleryButtonText: {
    ...typography.caption,
    color: palette.white
  },
  profileAnalyzeButton: {
    alignItems: "center",
    backgroundColor: palette.mint,
    borderRadius: radius.sm,
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.sm
  },
  profileAnalyzeText: {
    ...typography.caption,
    color: palette.ink
  },
  profileReport: {
    borderTopColor: palette.line,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.md
  },
  profileReportTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  profileReportTitle: {
    ...typography.h3,
    color: palette.white
  },
  profileReportScore: {
    ...typography.h3,
    color: palette.mint
  },
  profileConfidence: {
    ...typography.caption,
    color: palette.lemon
  },
  profileReportSummary: {
    ...typography.body,
    color: palette.paperMuted
  },
  profilePriority: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm
  },
  profilePriorityText: {
    ...typography.body,
    color: palette.white,
    flex: 1
  },
  metricStrip: {
    gap: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between"
  },
  trendCard: {
    backgroundColor: palette.panel,
    borderColor: palette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    minHeight: 198,
    padding: spacing.lg
  },
  trendTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  trendLabel: {
    ...typography.caption,
    color: palette.paperMuted
  },
  trendValue: {
    ...typography.h2,
    color: palette.white,
    marginTop: 4
  },
  trendDelta: {
    ...typography.caption,
    color: palette.mint
  },
  trendPeriod: {
    ...typography.caption,
    borderColor: palette.line,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: palette.muted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  miniChart: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: spacing.sm,
    height: 105,
    justifyContent: "space-between"
  },
  chartColumn: {
    alignItems: "center",
    flex: 1,
    height: "100%",
    justifyContent: "flex-end"
  },
  chartBar: {
    backgroundColor: palette.mint,
    borderRadius: radius.sm,
    minHeight: 6,
    opacity: 0.78,
    width: "48%"
  },
  chartDay: {
    ...typography.caption,
    color: palette.muted,
    fontSize: 10,
    marginTop: 5
  },
  revenueHero: {
    backgroundColor: palette.panel,
    borderColor: palette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  revenueRange: {
    color: palette.white,
    fontSize: 27,
    fontWeight: "900"
  },
  revenueBasis: {
    ...typography.body,
    color: palette.paperMuted
  },
  revenueChannels: {
    borderTopColor: palette.line,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.md
  },
  revenueLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  revenueName: {
    ...typography.caption,
    color: palette.paperMuted,
    flex: 1
  },
  revenueValue: {
    ...typography.caption,
    color: palette.mint
  },
  disclaimer: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 16
  },
  stack: {
    gap: spacing.md
  },
  signalCard: {
    backgroundColor: palette.panel,
    borderColor: palette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  signalTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  signalTitle: {
    ...typography.h3,
    color: palette.white,
    flex: 1
  },
  confidence: {
    ...typography.caption,
    color: palette.lemon
  },
  signalInsight: {
    ...typography.body,
    color: palette.paperMuted
  },
  signalAction: {
    ...typography.caption,
    color: palette.mint
  },
  bestVideo: {
    alignItems: "center",
    backgroundColor: palette.panel,
    borderColor: palette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.lg,
    padding: spacing.lg
  },
  bestScore: {
    color: palette.mint,
    fontSize: 44,
    fontWeight: "900",
    width: 70
  },
  bestCopy: {
    flex: 1,
    gap: spacing.xs
  },
  bestLabel: {
    ...typography.h3,
    color: palette.white
  },
  bestAdvice: {
    ...typography.body,
    color: palette.paperMuted
  }
});
