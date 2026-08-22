import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
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
import { palette, radius, spacing, typography } from "../theme";

type Props = {
  isTikTokConnected: boolean;
  onToggleTikTok: () => void;
};

export function DashboardScreen({ isTikTokConnected, onToggleTikTok }: Props) {
  const bestVideo = gradeVideo(recentVideos[0]);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.brandRow}>
          <View>
            <Text style={styles.brand}>VIRALY AI</Text>
            <Text style={styles.handle}>{creatorProfile.handle}</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={onToggleTikTok}
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
              {isTikTokConnected ? "Connecte" : "TikTok"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Ton copilote pour percer sans poster au hasard.</Text>
        <Text style={styles.subtitle}>{creatorProfile.summary}</Text>

        <View style={styles.heroTags}>
          <Tag label={creatorProfile.niche} color={palette.mint} />
          <Tag label={`stage ${creatorProfile.stage}`} color={palette.lemon} />
          <Tag label={`${formatCompactNumber(creatorProfile.followers)} abonnes`} color={palette.paper} />
        </View>
      </View>

      <ScoreDial
        caption="Score base sur les signaux de retention, sauvegardes, partage et potentiel revenu."
        label="Momentum createur"
        score={creatorProfile.growthScore}
      />

      <View style={styles.metricStrip}>
        {accountMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </View>

      <SectionHeader
        eyebrow="Aujourd'hui"
        title="3 actions qui peuvent bouger le compte"
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
    backgroundColor: palette.graphite,
    borderColor: palette.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  brand: {
    color: palette.white,
    fontSize: 16,
    fontWeight: "900"
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
    ...typography.title,
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
  metricStrip: {
    gap: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between"
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
    backgroundColor: palette.paper,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.lg,
    padding: spacing.lg
  },
  bestScore: {
    color: palette.ink,
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
    color: palette.ink
  },
  bestAdvice: {
    ...typography.body,
    color: palette.graphite
  }
});
