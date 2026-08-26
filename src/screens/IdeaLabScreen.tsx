import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { GlassPanel } from "../components/GlassPanel";
import { NeonButton } from "../components/NeonButton";
import { ProgressBar } from "../components/ProgressBar";
import { ScreenHero } from "../components/ScreenHero";
import { SectionHeader } from "../components/SectionHeader";
import { Tag } from "../components/Tag";
import {
  GeneratedIdea,
  IdeaAnalysisReport,
  analyzeIdea,
  generateIdeas
} from "../services/ai";
import { ProfileAnalysisReport } from "../services/profileAnalysis";
import { palette, radius, spacing, typography } from "../theme";
import { CreatorOnboardingProfile } from "../types";

type Props = {
  profile: CreatorOnboardingProfile;
  accountContext: ProfileAnalysisReport | null;
};

export function IdeaLabScreen({ profile, accountContext }: Props) {
  const [idea, setIdea] = useState("");
  const [report, setReport] = useState<IdeaAnalysisReport | null>(null);
  const [ideas, setIdeas] = useState<GeneratedIdea[]>([]);
  const [loading, setLoading] = useState<"analysis" | "ideas" | null>(null);

  const niche = profile.nicheTopic || profile.niche || "niche à préciser";

  const runAnalysis = async () => {
    if (idea.trim().length < 5) return;
    setLoading("analysis");
    try {
      setReport(await analyzeIdea(idea.trim(), profile, accountContext));
    } catch (error) {
      Alert.alert("Analyse de l'idée", error instanceof Error ? error.message : "Analyse impossible.");
    } finally {
      setLoading(null);
    }
  };

  const runGeneration = async () => {
    setLoading("ideas");
    try {
      setIdeas(await generateIdeas(profile, accountContext));
    } catch (error) {
      Alert.alert("Génération d'idées", error instanceof Error ? error.message : "Génération impossible.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenHero
        eyebrow="Studio créatif"
        icon="bulb-outline"
        subtitle="VIRALY cherche une promesse claire, une tension utile et un chemin logique vers ton objectif."
        title={<>Valide l'idée avant de <Text style={styles.titleAccent}>filmer.</Text></>}
      />

      <View style={styles.contextStrip}>
        <View style={styles.contextItem}><Ionicons color={palette.mint} name="locate-outline" size={16} /><Text numberOfLines={1} style={styles.contextText}>{niche}</Text></View>
        <View style={styles.contextDivider} />
        <View style={styles.contextItem}><Ionicons color={accountContext ? palette.mint : palette.muted} name={accountContext ? "checkmark-circle" : "cloud-offline-outline"} size={16} /><Text style={styles.contextText}>{accountContext ? "Profil analysé" : "Sans données compte"}</Text></View>
      </View>

      <GlassPanel glow style={styles.inputCard} textureOpacity={0.18}>
        <View style={styles.inputTop}>
          <Text style={styles.inputLabel}>IDÉE À TESTER</Text>
          <Text style={styles.scoreValue}>{report ? report.score : "--"}<Text style={styles.scoreMax}> / 100</Text></Text>
        </View>
        <TextInput
          multiline
          onChangeText={(value) => { setIdea(value); setReport(null); }}
          placeholder="Ex : 3 erreurs qui font perdre des clients aux coiffeurs indépendants"
          placeholderTextColor={palette.muted}
          style={styles.input}
          value={idea}
        />
        <ProgressBar color={palette.mint} value={report?.score || 0} />
        <NeonButton
          disabled={idea.trim().length < 5 || loading !== null}
          onPress={runAnalysis}
          title={loading === "analysis" ? "Lecture de la promesse..." : "Analyser cette idée"}
        />
      </GlassPanel>

      {report ? (
        <>
          <SectionHeader eyebrow="Verdict IA" title="Version directement filmable" />
          <GlassPanel style={styles.scriptCard} textureOpacity={0.15}>
            <Text style={styles.scriptLabel}>HOOK À L'ÉCRAN</Text>
            <Text style={styles.scriptTitle}>{report.optimizedHook}</Text>
            <Text style={styles.summary}>{report.summary}</Text>
            <View style={styles.divider} />
            {report.scriptSteps.map((step, index) => (
              <View key={`${step}-${index}`} style={styles.step}>
                <View style={styles.stepBadge}><Text style={styles.stepIndex}>{index + 1}</Text></View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </GlassPanel>

          <View style={styles.twoColumn}>
            <View style={styles.promiseCard}>
              <Text style={styles.promiseLabel}>PROMESSE</Text>
              <Text style={styles.promiseText}>{report.audiencePromise}</Text>
            </View>
            <View style={styles.revenueCard}>
              <Text style={styles.promiseLabel}>CONVERSION</Text>
              <Text style={styles.promiseText}>{report.revenuePath}</Text>
            </View>
          </View>

          {report.risks.length ? (
            <GlassPanel style={styles.riskPanel} textureOpacity={0.06}>
              <Text style={styles.riskLabel}>À CORRIGER AVANT TOURNAGE</Text>
              {report.risks.map((risk, index) => (
                <View key={`${risk}-${index}`} style={styles.riskLine}>
                  <Ionicons color={palette.paperMuted} name="alert-circle-outline" size={18} />
                  <Text style={styles.riskText}>{risk}</Text>
                </View>
              ))}
            </GlassPanel>
          ) : null}
        </>
      ) : null}

      <SectionHeader eyebrow="Sélection de la semaine" title="Idées personnalisées" />
      <NeonButton
        compact
        disabled={loading !== null}
        icon={ideas.length ? "refresh" : "sparkles-outline"}
        onPress={runGeneration}
        title={loading === "ideas" ? "Construction de 4 angles..." : ideas.length ? "Créer 4 nouveaux angles" : "Générer 4 idées avec l'IA"}
        variant="outline"
      />

      {ideas.length ? (
        <View style={styles.stack}>
          {ideas.map((item, index) => (
            <TouchableOpacity key={`${item.title}-${index}`} onPress={() => { setIdea(item.title); setReport(null); }} style={styles.ideaCard}>
              <View style={styles.ideaTop}>
                <View style={styles.rank}><Text style={styles.rankText}>0{index + 1}</Text></View>
                <View style={styles.ideaCopy}>
                  <Text style={styles.ideaFormat}>{item.format.toUpperCase()}</Text>
                  <Text style={styles.ideaTitle}>{item.title}</Text>
                </View>
                <View style={styles.scorePill}><Text style={styles.ideaScore}>{item.score}</Text></View>
              </View>
              <Text style={styles.ideaPromise}>{item.promise}</Text>
              <View style={styles.tags}>
                <Tag label={`effort ${item.effort}`} color={palette.paperMuted} />
                <Tag label={item.revenuePath} color={palette.mint} />
              </View>
              <View style={styles.useLine}><Text style={styles.useText}>Développer cette idée</Text><Ionicons color={palette.mint} name="arrow-forward" size={16} /></View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <GlassPanel style={styles.emptyPanel} textureOpacity={0.08}>
          <Ionicons color={palette.mint} name="bulb-outline" size={22} />
          <Text style={styles.empty}>La génération part de ta niche, de ta cadence et du diagnostic de ton profil.</Text>
        </GlassPanel>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl, paddingTop: spacing.lg },
  header: { gap: spacing.sm },
  kicker: { ...typography.caption, color: palette.mint },
  title: { ...typography.title, color: palette.white, maxWidth: 360 },
  titleAccent: { color: palette.electric },
  subtitle: { ...typography.body, color: palette.paperMuted },
  contextStrip: { alignItems: "center", backgroundColor: "rgba(3,10,27,0.68)", borderColor: palette.line, borderRadius: radius.pill, borderWidth: 1, flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  contextItem: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.xs, minWidth: 0 },
  contextText: { ...typography.caption, color: palette.paperMuted, flexShrink: 1 },
  contextDivider: { backgroundColor: palette.line, height: 20, width: 1 },
  inputCard: { gap: spacing.md, padding: spacing.lg },
  inputTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  inputLabel: { ...typography.caption, color: palette.mint },
  scoreValue: { color: palette.white, fontSize: 26, fontWeight: "800" },
  scoreMax: { color: palette.muted, fontSize: 12, fontWeight: "600" },
  input: { ...typography.body, backgroundColor: palette.graphite, borderColor: palette.line, borderRadius: radius.sm, borderWidth: 1, color: palette.white, minHeight: 118, padding: spacing.md, textAlignVertical: "top" },
  primaryButton: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.pill, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 52, paddingHorizontal: spacing.lg },
  primaryText: { ...typography.caption, color: palette.ink, textAlign: "center" },
  disabled: { opacity: 0.42 },
  scriptCard: { gap: spacing.md, padding: spacing.xl },
  scriptLabel: { ...typography.caption, color: palette.mint },
  scriptTitle: { ...typography.h2, color: palette.white },
  summary: { ...typography.body, color: palette.paperMuted },
  divider: { backgroundColor: palette.line, height: 1 },
  step: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
  stepBadge: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.pill, height: 28, justifyContent: "center", width: 28 },
  stepIndex: { color: palette.ink, fontSize: 11, fontWeight: "800" },
  stepText: { ...typography.body, color: palette.white, flex: 1 },
  twoColumn: { flexDirection: "row", gap: spacing.sm },
  promiseCard: { backgroundColor: palette.panelSoft, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, flex: 1, gap: spacing.sm, minWidth: 0, padding: spacing.md },
  revenueCard: { backgroundColor: "rgba(10,31,74,0.72)", borderColor: palette.lineStrong, borderRadius: radius.md, borderWidth: 1, flex: 1, gap: spacing.sm, minWidth: 0, padding: spacing.md },
  promiseLabel: { ...typography.caption, color: palette.mint },
  promiseText: { color: palette.white, fontSize: 13, fontWeight: "600", lineHeight: 19 },
  riskPanel: { gap: spacing.md, padding: spacing.lg },
  riskLabel: { ...typography.caption, color: palette.paperMuted },
  riskLine: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm },
  riskText: { ...typography.body, color: palette.paperMuted, flex: 1 },
  generateButton: { alignItems: "center", borderColor: palette.lineStrong, borderRadius: radius.pill, borderWidth: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 50 },
  generateText: { ...typography.caption, color: palette.mint, textAlign: "center" },
  stack: { gap: spacing.md },
  ideaCard: { backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  ideaTop: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
  rank: { alignItems: "center", borderColor: palette.lineStrong, borderRadius: radius.pill, borderWidth: 1, height: 38, justifyContent: "center", width: 38 },
  rankText: { color: palette.mint, fontSize: 11, fontWeight: "800" },
  ideaCopy: { flex: 1, gap: 3 },
  ideaTitle: { ...typography.h3, color: palette.white },
  ideaFormat: { ...typography.caption, color: palette.muted, fontSize: 10 },
  scorePill: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.pill, height: 38, justifyContent: "center", width: 38 },
  ideaScore: { color: palette.ink, fontSize: 14, fontWeight: "800" },
  ideaPromise: { ...typography.body, color: palette.paperMuted },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  useLine: { alignItems: "center", borderTopColor: palette.line, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingTop: spacing.sm },
  useText: { ...typography.caption, color: palette.mint },
  emptyPanel: { alignItems: "center", flexDirection: "row", gap: spacing.md, padding: spacing.lg },
  empty: { ...typography.body, color: palette.paperMuted, flex: 1 }
});
