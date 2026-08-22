import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ProgressBar } from "../components/ProgressBar";
import { SectionHeader } from "../components/SectionHeader";
import { Tag } from "../components/Tag";
import {
  nicheOptions,
  postingSlots,
  revenuePaths,
  storyPlays,
  weeklyCycle
} from "../data/viralInsights";
import { palette, radius, spacing, typography } from "../theme";

export function StrategyScreen() {
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

      <SectionHeader eyebrow="Revenus" title="Transformer l'attention" />
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
