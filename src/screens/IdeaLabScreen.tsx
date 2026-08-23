import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ProgressBar } from "../components/ProgressBar";
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
      <View style={styles.header}>
        <Text style={styles.kicker}>STUDIO D'IDÉES</Text>
        <Text style={styles.title}>Teste avant de filmer.</Text>
        <Text style={styles.subtitle}>L'analyse utilise ton objectif, ta niche, ta capacité et le dernier diagnostic du compte.</Text>
      </View>

      <View style={styles.inputCard}>
        <Text style={styles.inputLabel}>IDÉE À TESTER</Text>
        <TextInput
          multiline
          onChangeText={(value) => { setIdea(value); setReport(null); }}
          placeholder="Ex : 3 erreurs qui bloquent tes vues TikTok"
          placeholderTextColor={palette.muted}
          style={styles.input}
          value={idea}
        />
        <View style={styles.scoreRow}>
          <View>
            <Text style={styles.scoreLabel}>Score IA</Text>
            <Text style={styles.scoreValue}>{report ? `${report.score}/100` : "--"}</Text>
          </View>
          <TouchableOpacity disabled={idea.trim().length < 5 || loading !== null} onPress={runAnalysis} style={[styles.primaryButton, idea.trim().length < 5 && styles.disabled]}>
            <Ionicons color={palette.ink} name="sparkles-outline" size={18} />
            <Text style={styles.primaryText}>{loading === "analysis" ? "Analyse..." : "Analyser"}</Text>
          </TouchableOpacity>
        </View>
        <ProgressBar color={report && report.score >= 70 ? palette.mint : palette.lemon} value={report?.score || 0} />
      </View>

      {report ? (
        <>
          <SectionHeader eyebrow="Version optimisée" title="Plan directement filmable" />
          <View style={styles.scriptCard}>
            <Text style={styles.scriptLabel}>HOOK PROPOSÉ</Text>
            <Text style={styles.scriptTitle}>{report.optimizedHook}</Text>
            <Text style={styles.summary}>{report.summary}</Text>
            <View style={styles.divider} />
            {report.scriptSteps.map((step, index) => (
              <View key={`${step}-${index}`} style={styles.step}>
                <Text style={styles.stepIndex}>0{index + 1}</Text>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
          <View style={styles.promiseCard}>
            <Text style={styles.promiseLabel}>PROMESSE AUDIENCE</Text>
            <Text style={styles.promiseText}>{report.audiencePromise}</Text>
            <Text style={styles.revenueText}>Revenu : {report.revenuePath}</Text>
          </View>
        </>
      ) : null}

      <SectionHeader eyebrow="Cette semaine" title="Idées personnalisées" />
      <TouchableOpacity disabled={loading !== null} onPress={runGeneration} style={styles.generateButton}>
        <Ionicons color={palette.mint} name="refresh-outline" size={19} />
        <Text style={styles.generateText}>{loading === "ideas" ? "Création en cours..." : ideas.length ? "Regénérer 4 idées" : "Générer 4 idées avec l'IA"}</Text>
      </TouchableOpacity>

      {ideas.length ? (
        <View style={styles.stack}>
          {ideas.map((item, index) => (
            <TouchableOpacity key={`${item.title}-${index}`} onPress={() => { setIdea(item.title); setReport(null); }} style={styles.ideaCard}>
              <View style={styles.ideaTop}>
                <View style={styles.rank}><Text style={styles.rankText}>{index + 1}</Text></View>
                <View style={styles.ideaCopy}>
                  <Text style={styles.ideaTitle}>{item.title}</Text>
                  <Text style={styles.ideaFormat}>{item.format}</Text>
                </View>
                <Text style={styles.ideaScore}>{item.score}</Text>
              </View>
              <Text style={styles.ideaPromise}>{item.promise}</Text>
              <View style={styles.tags}>
                <Tag label={`effort ${item.effort}`} color={palette.sky} />
                <Tag label={item.revenuePath} color={palette.mint} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>Aucune idée générique préchargée : lance une génération liée à ton profil.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { gap: spacing.sm },
  kicker: { ...typography.caption, color: palette.lemon },
  title: { ...typography.title, color: palette.white },
  subtitle: { ...typography.body, color: palette.paperMuted },
  inputCard: { backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  inputLabel: { ...typography.caption, color: palette.mint },
  input: { ...typography.body, backgroundColor: palette.graphite, borderColor: palette.line, borderRadius: radius.sm, borderWidth: 1, color: palette.white, minHeight: 96, padding: spacing.md, textAlignVertical: "top" },
  scoreRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  scoreLabel: { ...typography.caption, color: palette.muted },
  scoreValue: { color: palette.white, fontSize: 26, fontWeight: "900" },
  primaryButton: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.sm, flexDirection: "row", gap: spacing.xs, minHeight: 44, paddingHorizontal: spacing.md },
  primaryText: { ...typography.caption, color: palette.ink },
  disabled: { opacity: 0.45 },
  scriptCard: { backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  scriptLabel: { ...typography.caption, color: palette.mint },
  scriptTitle: { ...typography.h2, color: palette.white },
  summary: { ...typography.body, color: palette.paperMuted },
  divider: { backgroundColor: palette.line, height: 1 },
  step: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
  stepIndex: { ...typography.caption, color: palette.lemon },
  stepText: { ...typography.body, color: palette.white, flex: 1 },
  promiseCard: { backgroundColor: palette.panelSoft, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, gap: spacing.sm, padding: spacing.lg },
  promiseLabel: { ...typography.caption, color: palette.sky },
  promiseText: { ...typography.h3, color: palette.white },
  revenueText: { ...typography.caption, color: palette.mint },
  generateButton: { alignItems: "center", borderColor: palette.mint, borderRadius: radius.sm, borderWidth: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 48 },
  generateText: { ...typography.caption, color: palette.mint },
  stack: { gap: spacing.md },
  ideaCard: { backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, gap: spacing.md, padding: spacing.md },
  ideaTop: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  rank: { alignItems: "center", backgroundColor: palette.lemon, borderRadius: radius.sm, height: 36, justifyContent: "center", width: 36 },
  rankText: { color: palette.ink, fontWeight: "900" },
  ideaCopy: { flex: 1, gap: 3 },
  ideaTitle: { ...typography.h3, color: palette.white },
  ideaFormat: { ...typography.caption, color: palette.muted },
  ideaScore: { color: palette.mint, fontSize: 22, fontWeight: "900" },
  ideaPromise: { ...typography.body, color: palette.paperMuted },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  empty: { ...typography.body, color: palette.muted, textAlign: "center" }
});
