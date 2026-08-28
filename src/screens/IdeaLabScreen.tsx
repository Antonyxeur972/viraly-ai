import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { GlassPanel } from "../components/GlassPanel";
import { NeonButton } from "../components/NeonButton";
import { ProgressBar } from "../components/ProgressBar";
import { ScreenHero } from "../components/ScreenHero";
import { SectionHeader } from "../components/SectionHeader";
import {
  IdeaAnalysisReport,
  analyzeIdea,
  generateIdea
} from "../services/ai";
import { ProfileAnalysisReport } from "../services/profileAnalysis";
import {
  AnalysisHistoryItem,
  deleteAnalysisHistory,
  listAnalysisHistory
} from "../services/analysisHistory";
import { palette, radius, spacing, typography } from "../theme";
import { CreatorOnboardingProfile } from "../types";

type Props = {
  profile: CreatorOnboardingProfile;
  accountContext: ProfileAnalysisReport | null;
};

export function IdeaLabScreen({ profile, accountContext }: Props) {
  const [idea, setIdea] = useState("");
  const [report, setReport] = useState<IdeaAnalysisReport | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryItem<IdeaAnalysisReport>[]>([]);
  const [loading, setLoading] = useState<"analysis" | "ideas" | null>(null);

  useEffect(() => {
    listAnalysisHistory<IdeaAnalysisReport>("idea", 20)
      .then(setHistory)
      .catch(() => {});
  }, []);

  const runAnalysis = async () => {
    if (idea.trim().length < 5) return;
    setLoading("analysis");
    try {
      const nextReport = await analyzeIdea(idea.trim(), profile, accountContext);
      setReport(nextReport);
      setHistory((items) => [
        { id: nextReport.analysisId, kind: "idea", createdAt: new Date().toISOString(), report: nextReport },
        ...items.filter((item) => item.id !== nextReport.analysisId)
      ].slice(0, 20));
    } catch (error) {
      Alert.alert("Analyse de l'idée", error instanceof Error ? error.message : "Analyse impossible.");
    } finally {
      setLoading(null);
    }
  };

  const confirmDelete = (item: AnalysisHistoryItem<IdeaAnalysisReport>) => {
    Alert.alert("Supprimer cette idée ?", "L'idée et son analyse seront retirées de l'historique.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () => {
          deleteAnalysisHistory(item.id)
            .then(() => {
              setHistory((items) => items.filter((entry) => entry.id !== item.id));
              if (report?.analysisId === item.id) setReport(null);
            })
            .catch((error) => Alert.alert("Historique", error instanceof Error ? error.message : "Suppression impossible."));
        }
      }
    ]);
  };

  const runGeneration = async () => {
    setLoading("ideas");
    try {
      const nextReport = await generateIdea(profile, accountContext);
      setIdea(nextReport.idea || nextReport.historyTitle || nextReport.optimizedHook);
      setReport(nextReport);
      setHistory((items) => [
        { id: nextReport.analysisId, kind: "idea", createdAt: new Date().toISOString(), report: nextReport },
        ...items.filter((item) => item.id !== nextReport.analysisId)
      ].slice(0, 20));
    } catch (error) {
      Alert.alert("Génération de l'idée", error instanceof Error ? error.message : "Génération impossible.");
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
        variant="ideas"
      />

      <View style={styles.profileStatus}>
        <Ionicons color={accountContext ? palette.cyan : palette.muted} name={accountContext ? "checkmark-circle" : "cloud-offline-outline"} size={16} />
        <Text style={styles.profileStatusText}>{accountContext ? `Profil analysé · ${accountContext.score}/100` : "Profil déclaré · analyse disponible depuis l'accueil"}</Text>
      </View>

      <SectionHeader eyebrow="Création assistée" title="Une idée prête à produire" />
      <NeonButton
        disabled={loading !== null}
        icon={report ? "refresh" : "sparkles"}
        onPress={runGeneration}
        title={loading === "ideas" ? "Création du contenu complet..." : report ? "Générer une nouvelle idée" : "Générer une idée complète avec l'IA"}
      />

      <SectionHeader eyebrow="Ton propre angle" title="Analyser une idée existante" />
      <GlassPanel glow style={styles.inputCard} textureOpacity={0.18}>
        <View style={styles.inputTop}>
          <Text style={styles.inputLabel}>IDÉE À TESTER</Text>
          <Text style={styles.scoreValue}>{report ? `${report.score}/100` : ""}</Text>
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
          compact
          disabled={idea.trim().length < 5 || loading !== null}
          onPress={runAnalysis}
          title={loading === "analysis" ? "Lecture de la promesse..." : "Analyser cette idée"}
        />
      </GlassPanel>

      {report ? (
        <>
          <SectionHeader eyebrow="Contenu complet" title="Prêt à tourner ou publier" />
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

      <SectionHeader eyebrow="Mémoire" title="Historique des idées" action={`${history.length}`} />
      {history.length ? (
        <View style={styles.historyList}>
          {history.map((item) => (
            <View key={item.id} style={[styles.historyRow, report?.analysisId === item.id && styles.historyRowActive]}>
              <TouchableOpacity onPress={() => { setReport(item.report); setIdea(item.report.idea || item.report.historyTitle || ""); }} style={styles.historyOpen}>
                <Ionicons color={palette.electric} name="sparkles-outline" size={18} />
                <View style={styles.historyCopy}>
                  <Text numberOfLines={2} style={styles.historyTitle}>{item.report.idea || item.report.historyTitle || item.report.optimizedHook}</Text>
                  <Text numberOfLines={2} style={styles.historySummary}>{item.report.summary}</Text>
                  <Text style={styles.historyRead}>Relire l'analyse · {item.report.score}/100</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity accessibilityLabel="Supprimer cette idée" onPress={() => confirmDelete(item)} style={styles.historyDelete}>
                <Ionicons color={palette.muted} name="trash-outline" size={18} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}
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
  profileStatus: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "rgba(8,25,59,0.68)", borderRadius: radius.pill, flexDirection: "row", gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  profileStatusText: { color: palette.paperMuted, fontSize: 10, fontWeight: "700" },
  contextStrip: { alignItems: "center", backgroundColor: "rgba(3,10,27,0.68)", borderColor: palette.line, borderRadius: radius.pill, borderWidth: 1, flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  contextItem: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.xs, minWidth: 0 },
  contextText: { ...typography.caption, color: palette.paperMuted, flexShrink: 1 },
  contextDivider: { backgroundColor: palette.line, height: 20, width: 1 },
  inputCard: { gap: spacing.sm, padding: spacing.md },
  inputTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  inputLabel: { ...typography.caption, color: palette.mint },
  scoreValue: { color: palette.electric, fontSize: 12, fontWeight: "900" },
  scoreMax: { color: palette.muted, fontSize: 12, fontWeight: "600" },
  input: { ...typography.body, backgroundColor: palette.graphite, borderColor: palette.line, borderRadius: radius.sm, borderWidth: 1, color: palette.white, minHeight: 76, padding: spacing.md, textAlignVertical: "top" },
  qualityRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  qualityLabel: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  qualityText: { ...typography.caption, color: palette.paperMuted },
  qualityScore: { color: palette.electric, fontSize: 13, fontWeight: "900" },
  qualityMax: { color: palette.muted, fontSize: 10, fontWeight: "700" },
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
  emptyPanel: { alignItems: "center", flexDirection: "row", gap: spacing.md, padding: spacing.lg },
  empty: { ...typography.body, color: palette.paperMuted, flex: 1 },
  historyList: { gap: spacing.xs },
  historyRow: { alignItems: "stretch", backgroundColor: "rgba(7,17,38,0.64)", borderRadius: radius.md, flexDirection: "row", minHeight: 108, overflow: "hidden" },
  historyRowActive: { backgroundColor: "rgba(24,67,139,0.42)" },
  historyOpen: { alignItems: "flex-start", flex: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  historyCopy: { flex: 1, gap: 4, minWidth: 0 },
  historyTitle: { color: palette.white, fontSize: 13, fontWeight: "800", lineHeight: 18 },
  historySummary: { color: palette.paperMuted, fontSize: 11, lineHeight: 16 },
  historyRead: { color: palette.electric, fontSize: 9, fontWeight: "800" },
  historyDelete: { alignItems: "center", justifyContent: "center", width: 48 }
});
