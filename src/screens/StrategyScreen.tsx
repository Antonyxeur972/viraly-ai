import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ProgressBar } from "../components/ProgressBar";
import { SectionHeader } from "../components/SectionHeader";
import { Tag } from "../components/Tag";
import {
  creatorProfile,
  liveStrategies,
  nicheOptions,
  postingSlots,
  revenuePaths,
  storyCycles,
  storyPlays,
  weeklyCycle
} from "../data/viralInsights";
import { buildEligibilityGoals, estimateRevenuePotential } from "../lib/revenueModel";
import { formatCompactNumber } from "../lib/viralScore";
import { palette, radius, spacing, typography } from "../theme";

export function StrategyScreen() {
  const eligibilityGoals = buildEligibilityGoals(creatorProfile.followers);
  const revenueForecast = estimateRevenuePotential({
    followers: creatorProfile.followers,
    averageViews: 48000
  });

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.kicker}>Plan de croissance</Text>
        <Text style={styles.title}>Choisis une niche, puis tiens un cycle.</Text>
        <Text style={styles.subtitle}>
          La croissance vient d'une boucle : idee forte, format repete, mesure,
          recyclage, puis monetisation quand le signal est clair.
        </Text>
      </View>

      <SectionHeader eyebrow="Paliers" title="Ce que le compte peut debloquer" />
      <View style={styles.stack}>
        {eligibilityGoals.map((goal) => {
          const progress = Math.min((goal.current / goal.target) * 100, 100);
          return (
            <View key={goal.id} style={styles.goalCard}>
              <View style={styles.goalTop}>
                <View style={styles.goalIcon}>
                  <Ionicons color={palette.ink} name={goal.icon} size={20} />
                </View>
                <View style={styles.goalCopy}>
                  <Text style={styles.goalTitle}>{goal.title}</Text>
                  <Text style={styles.goalRequirement}>{goal.requirement}</Text>
                </View>
                <Text style={styles.goalProgress}>{Math.round(progress)}%</Text>
              </View>
              <ProgressBar color={progress >= 100 ? palette.mint : palette.lemon} value={progress} />
              <Text style={styles.goalStatus}>{goal.status}</Text>
              <Text style={styles.goalAction}>{goal.nextAction}</Text>
            </View>
          );
        })}
      </View>

      <SectionHeader eyebrow="Niches" title="3 angles a comparer" />
      <View style={styles.stack}>
        {nicheOptions.map((niche) => (
          <View key={niche.name} style={styles.nicheCard}>
            <View style={styles.nicheTop}>
              <View style={styles.nicheCopy}>
                <Text style={styles.nicheName}>{niche.name}</Text>
                <Text style={styles.nicheAudience}>{niche.audience}</Text>
              </View>
              <Text style={styles.nicheScore}>{niche.score}</Text>
            </View>
            <ProgressBar color={palette.mint} value={niche.score} />
            <Text style={styles.nicheLine}>Edge : {niche.contentEdge}</Text>
            <Text style={styles.nicheLine}>Revenus : {niche.revenueAngle}</Text>
            <View style={styles.tags}>
              <Tag label={`saturation ${niche.saturation}`} color={palette.lemon} />
              <Tag label={niche.firstSeries} color={palette.paper} />
            </View>
          </View>
        ))}
      </View>

      <SectionHeader eyebrow="Publication" title="Creneaux a tester 14 jours" />
      <View style={styles.slots}>
        {postingSlots.map((slot) => (
          <View key={`${slot.day}-${slot.time}`} style={styles.slot}>
            <View style={styles.priority}>
              <Text style={styles.priorityText}>{slot.priority}</Text>
            </View>
            <View style={styles.slotCopy}>
              <Text style={styles.slotTime}>{slot.day} · {slot.time}</Text>
              <Text style={styles.slotReason}>{slot.reason}</Text>
            </View>
          </View>
        ))}
      </View>

      <SectionHeader eyebrow="Systeme" title="Cycle de posting" />
      <View style={styles.timeline}>
        {weeklyCycle.map((step) => (
          <View key={step.day} style={styles.timelineItem}>
            <View style={[styles.timelineIcon, { backgroundColor: step.accent }]}>
              <Ionicons color={palette.ink} name={step.icon} size={20} />
            </View>
            <View style={styles.timelineCopy}>
              <Text style={styles.timelineDay}>{step.day} · {step.focus}</Text>
              <Text style={styles.timelineAction}>{step.action}</Text>
            </View>
          </View>
        ))}
      </View>

      <SectionHeader eyebrow="Stories" title="Relancer sans spammer" />
      <View style={styles.paperBlock}>
        {storyPlays.map((play) => (
          <View key={play} style={styles.paperLine}>
            <Ionicons color={palette.coral} name="radio-button-on" size={14} />
            <Text style={styles.paperText}>{play}</Text>
          </View>
        ))}
      </View>

      <View style={styles.storyCycle}>
        {storyCycles.map((story) => (
          <View key={story.moment} style={styles.storyItem}>
            <Text style={styles.storyMoment}>{story.moment}</Text>
            <View style={styles.storyCopy}>
              <Text style={styles.storyAction}>{story.action}</Text>
              <Text style={styles.storyRevenue}>{story.revenueLink}</Text>
            </View>
          </View>
        ))}
      </View>

      <SectionHeader eyebrow="LIVE" title="Formats qui construisent et vendent" />
      <View style={styles.stack}>
        {liveStrategies.map((live) => (
          <View key={live.title} style={styles.liveCard}>
            <View style={styles.liveTop}>
              <Ionicons color={palette.coral} name="radio-outline" size={22} />
              <View style={styles.liveCopy}>
                <Text style={styles.liveTitle}>{live.title}</Text>
                <Text style={styles.liveCadence}>{live.cadence}</Text>
              </View>
            </View>
            <Text style={styles.liveFlow}>{live.flow}</Text>
            <Text style={styles.livePrep}>{live.prep}</Text>
            <Tag label={live.revenue} color={palette.mint} />
          </View>
        ))}
      </View>

      <SectionHeader eyebrow="Revenus" title="Transformer l'attention" />
      <View style={styles.forecastCard}>
        <Text style={styles.forecastRange}>
          {formatCompactNumber(revenueForecast.monthlyLow)} - {formatCompactNumber(revenueForecast.monthlyHigh)} EUR / mois
        </Text>
        <Text style={styles.forecastBase}>
          Hypothese : {formatCompactNumber(revenueForecast.monthlyViews)} vues mensuelles.
        </Text>
        {revenueForecast.channels.map((channel) => (
          <View key={channel.name} style={styles.channelBlock}>
            <View style={styles.channelTop}>
              <Text style={styles.channelName}>{channel.name}</Text>
              <Text style={styles.channelValue}>
                {formatCompactNumber(channel.monthlyLow)}-{formatCompactNumber(channel.monthlyHigh)} EUR
              </Text>
            </View>
            <Text style={styles.channelDirection}>{channel.contentDirection}</Text>
            <Text style={styles.channelAction}>{channel.conversionAction}</Text>
          </View>
        ))}
        <Text style={styles.forecastDisclaimer}>{revenueForecast.disclaimer}</Text>
      </View>
      <View style={styles.stack}>
        {revenuePaths.map((path) => (
          <View key={path.name} style={styles.revenueCard}>
            <Text style={styles.revenueName}>{path.name}</Text>
            <Text style={styles.revenueStage}>{path.stage}</Text>
            <Text style={styles.revenueAction}>{path.nextAction}</Text>
            <Tag label={path.potential} color={palette.mint} />
          </View>
        ))}
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
  header: {
    gap: spacing.sm
  },
  kicker: {
    ...typography.caption,
    color: palette.sky
  },
  title: {
    ...typography.title,
    color: palette.white
  },
  subtitle: {
    ...typography.body,
    color: palette.paperMuted
  },
  stack: {
    gap: spacing.md
  },
  goalCard: {
    backgroundColor: palette.panel,
    borderColor: palette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  goalTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  goalIcon: {
    alignItems: "center",
    backgroundColor: palette.lemon,
    borderRadius: radius.sm,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  goalCopy: {
    flex: 1,
    gap: 3
  },
  goalTitle: {
    ...typography.h3,
    color: palette.white
  },
  goalRequirement: {
    ...typography.caption,
    color: palette.muted
  },
  goalProgress: {
    ...typography.caption,
    color: palette.mint
  },
  goalStatus: {
    ...typography.caption,
    color: palette.lemon
  },
  goalAction: {
    ...typography.body,
    color: palette.paperMuted
  },
  nicheCard: {
    backgroundColor: palette.panel,
    borderColor: palette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  nicheTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md
  },
  nicheCopy: {
    flex: 1,
    gap: 4
  },
  nicheName: {
    ...typography.h3,
    color: palette.white
  },
  nicheAudience: {
    ...typography.caption,
    color: palette.muted
  },
  nicheScore: {
    color: palette.mint,
    fontSize: 28,
    fontWeight: "900"
  },
  nicheLine: {
    ...typography.body,
    color: palette.paperMuted
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  slots: {
    backgroundColor: palette.paper,
    borderRadius: radius.md,
    gap: spacing.md,
    padding: spacing.md
  },
  slot: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md
  },
  priority: {
    alignItems: "center",
    backgroundColor: palette.ink,
    borderRadius: radius.sm,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  priorityText: {
    ...typography.caption,
    color: palette.white
  },
  slotCopy: {
    flex: 1,
    gap: 3
  },
  slotTime: {
    ...typography.h3,
    color: palette.ink
  },
  slotReason: {
    ...typography.body,
    color: palette.graphite
  },
  timeline: {
    gap: spacing.md
  },
  timelineItem: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md
  },
  timelineIcon: {
    alignItems: "center",
    borderRadius: radius.sm,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  timelineCopy: {
    backgroundColor: palette.panel,
    borderColor: palette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: spacing.md
  },
  timelineDay: {
    ...typography.h3,
    color: palette.white
  },
  timelineAction: {
    ...typography.body,
    color: palette.paperMuted
  },
  paperBlock: {
    backgroundColor: palette.paper,
    borderRadius: radius.md,
    gap: spacing.sm,
    padding: spacing.md
  },
  paperLine: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm
  },
  paperText: {
    ...typography.body,
    color: palette.ink,
    flex: 1
  },
  storyCycle: {
    gap: spacing.sm
  },
  storyItem: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md
  },
  storyMoment: {
    ...typography.caption,
    color: palette.ink,
    backgroundColor: palette.sky,
    borderRadius: radius.sm,
    minWidth: 54,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textAlign: "center"
  },
  storyCopy: {
    borderBottomColor: palette.line,
    borderBottomWidth: 1,
    flex: 1,
    gap: 4,
    paddingBottom: spacing.md
  },
  storyAction: {
    ...typography.body,
    color: palette.white
  },
  storyRevenue: {
    ...typography.caption,
    color: palette.mint
  },
  liveCard: {
    alignItems: "flex-start",
    backgroundColor: palette.panel,
    borderColor: palette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  liveTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  liveCopy: {
    flex: 1,
    gap: 3
  },
  liveTitle: {
    ...typography.h3,
    color: palette.white
  },
  liveCadence: {
    ...typography.caption,
    color: palette.coral
  },
  liveFlow: {
    ...typography.body,
    color: palette.paperMuted
  },
  livePrep: {
    ...typography.caption,
    color: palette.lemon
  },
  forecastCard: {
    backgroundColor: palette.paper,
    borderRadius: radius.md,
    gap: spacing.md,
    padding: spacing.lg
  },
  forecastRange: {
    color: palette.ink,
    fontSize: 26,
    fontWeight: "900"
  },
  forecastBase: {
    ...typography.caption,
    color: palette.graphite
  },
  channelBlock: {
    borderTopColor: "#C9C8C1",
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingTop: spacing.md
  },
  channelTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  channelName: {
    ...typography.h3,
    color: palette.ink
  },
  channelValue: {
    ...typography.caption,
    color: palette.ink
  },
  channelDirection: {
    ...typography.body,
    color: palette.graphite
  },
  channelAction: {
    ...typography.caption,
    color: "#29594F"
  },
  forecastDisclaimer: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 16
  },
  revenueCard: {
    alignItems: "flex-start",
    backgroundColor: palette.panel,
    borderColor: palette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  revenueName: {
    ...typography.h3,
    color: palette.white
  },
  revenueStage: {
    ...typography.caption,
    color: palette.lemon
  },
  revenueAction: {
    ...typography.body,
    color: palette.paperMuted
  }
});
