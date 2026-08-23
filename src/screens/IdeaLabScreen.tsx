import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import { ProgressBar } from "../components/ProgressBar";
import { SectionHeader } from "../components/SectionHeader";
import { Tag } from "../components/Tag";
import { contentIdeas } from "../data/viralInsights";
import { rankIdeas, scoreIdea } from "../lib/viralScore";
import { palette, radius, spacing, typography } from "../theme";

export function IdeaLabScreen() {
  const [idea, setIdea] = useState(
    "Je montre comment choisir une niche TikTok rentable en 10 minutes"
  );
  const rankedIdeas = useMemo(() => rankIdeas(contentIdeas), []);
  const customIdeaScore = useMemo(() => {
    const lengthSignal = Math.min(idea.trim().length / 90, 1) * 30;
    const promiseSignal = /comment|pourquoi|erreur|rentable|avant|apres|gagner/i.test(idea)
      ? 28
      : 16;
    const claritySignal = idea.trim().split(" ").length >= 7 ? 24 : 14;
    const curiositySignal = /\d|secret|verite|sans|test/i.test(idea) ? 18 : 10;

    return Math.round(lengthSignal + promiseSignal + claritySignal + curiositySignal);
  }, [idea]);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.kicker}>Idea Lab</Text>
        <Text style={styles.title}>Score tes idees avant de filmer.</Text>
        <Text style={styles.subtitle}>
          L'objectif est simple : eviter de produire une video sans promesse,
          sans tension ou sans lien clair avec ton audience.
        </Text>
      </View>

      <View style={styles.inputCard}>
        <Text style={styles.inputLabel}>Idee a tester</Text>
        <TextInput
          multiline
          onChangeText={setIdea}
          placeholder="Ex: 3 erreurs qui bloquent tes vues TikTok"
          placeholderTextColor={palette.muted}
          style={styles.input}
          value={idea}
        />
        <View style={styles.scoreRow}>
          <View>
            <Text style={styles.scoreLabel}>Score idee</Text>
            <Text style={styles.scoreValue}>{customIdeaScore}/100</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" style={styles.primaryButton}>
            <Ionicons color={palette.ink} name="sparkles-outline" size={18} />
            <Text style={styles.primaryText}>Analyser</Text>
          </TouchableOpacity>
        </View>
        <ProgressBar
          color={customIdeaScore >= 75 ? palette.mint : palette.lemon}
          value={customIdeaScore}
        />
      </View>

      <SectionHeader eyebrow="Plan de tournage" title="Version optimisee" />
      <View style={styles.scriptCard}>
        <Text style={styles.scriptTitle}>Hook propose</Text>
        <Text style={styles.scriptBody}>
          "Si ta niche TikTok ne peut pas vendre quelque chose en 30 jours, tu
          risques de construire une audience qui regarde mais n'achete jamais."
        </Text>
        <View style={styles.scriptSteps}>
          {[
            "0-2s : annonce le risque ou resultat",
            "3-8s : montre une grille simple",
            "9-18s : applique-la a 2 exemples",
            "19-25s : CTA vers profil ou checklist"
          ].map((step) => (
            <View key={step} style={styles.step}>
              <Ionicons color={palette.mint} name="checkmark-circle" size={18} />
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      </View>

      <SectionHeader
        eyebrow="Opportunites"
        title="Idees classees pour la semaine"
        action="top scores"
      />
      <View style={styles.stack}>
        {rankedIdeas.map((item, index) => {
          const score = scoreIdea(item);
          return (
            <View key={item.title} style={styles.ideaCard}>
              <View style={styles.ideaTop}>
                <View style={styles.rank}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <View style={styles.ideaCopy}>
                  <Text style={styles.ideaTitle}>{item.title}</Text>
                  <Text style={styles.ideaFormat}>{item.format}</Text>
                </View>
                <Text style={styles.ideaScore}>{score}</Text>
              </View>
              <Text style={styles.promise}>{item.promise}</Text>
              <View style={styles.tags}>
                {item.tags.map((tag) => (
                  <Tag key={tag} label={tag} color={palette.paper} />
                ))}
                <Tag label={`effort ${item.effort}`} color={palette.sky} />
              </View>
            </View>
          );
        })}
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
    color: palette.lemon
  },
  title: {
    ...typography.title,
    color: palette.white
  },
  subtitle: {
    ...typography.body,
    color: palette.paperMuted
  },
  inputCard: {
    backgroundColor: palette.panel,
    borderColor: palette.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  inputLabel: {
    ...typography.caption,
    color: palette.mint
  },
  input: {
    ...typography.body,
    backgroundColor: palette.graphite,
    borderColor: palette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    color: palette.white,
    minHeight: 96,
    padding: spacing.md,
    textAlignVertical: "top"
  },
  scoreRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  scoreLabel: {
    ...typography.caption,
    color: palette.muted
  },
  scoreValue: {
    color: palette.white,
    fontSize: 26,
    fontWeight: "900"
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: palette.mint,
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md
  },
  primaryText: {
    ...typography.caption,
    color: palette.ink
  },
  scriptCard: {
    backgroundColor: palette.panel,
    borderColor: palette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  scriptTitle: {
    ...typography.h3,
    color: palette.mint
  },
  scriptBody: {
    ...typography.body,
    color: palette.white
  },
  scriptSteps: {
    gap: spacing.sm
  },
  step: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm
  },
  stepText: {
    ...typography.body,
    color: palette.paperMuted,
    flex: 1
  },
  stack: {
    gap: spacing.md
  },
  ideaCard: {
    backgroundColor: palette.panel,
    borderColor: palette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  ideaTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  rank: {
    alignItems: "center",
    backgroundColor: palette.lemon,
    borderRadius: radius.sm,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  rankText: {
    color: palette.ink,
    fontWeight: "900"
  },
  ideaCopy: {
    flex: 1,
    gap: 3
  },
  ideaTitle: {
    ...typography.h3,
    color: palette.white
  },
  ideaFormat: {
    ...typography.caption,
    color: palette.muted
  },
  ideaScore: {
    color: palette.mint,
    fontSize: 24,
    fontWeight: "900"
  },
  promise: {
    ...typography.body,
    color: palette.paperMuted
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  }
});
